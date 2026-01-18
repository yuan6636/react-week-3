import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as bootstrap from "bootstrap";

const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

const { Modal } = bootstrap;
const INITIAL_TEMPLATE_DATA = {
  id: '',
  title: '',
  category: '',
  origin_price: '',
  price: '',
  unit: '',
  description: '',
  content: '',
  is_enabled: false,
  imageUrl: '',
  imagesUrl: []
};

function App() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [isAuth, setIsAuth] = useState(false);
  const [products, setProducts] = useState([]);
  const [modalType, setModalType] = useState(''); // 'edit', 'create', 'delete'
  const [templateData, setTemplateData] = useState(INITIAL_TEMPLATE_DATA);

  const productModalRef = useRef(null);
  
  const getProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/${API_PATH}/admin/products`);
      setProducts(res.data.products);
    } catch (error) {
      console.error('取得產品資料失敗: ', error?.response?.data?.message)
    }
  };

  const updateProduct = async () => {
    let url;
    let method;

    if (modalType === 'create') {
      url = `${API_BASE}/api/${API_PATH}/admin/product`;
      method = 'post';
    } else if (modalType === 'edit') {
      url = `${API_BASE}/api/${API_PATH}/admin/product/${templateData.id}`;
      method = 'put';
    }

    // 修正 templateData 資料格式
    const productData = {
      data: {
        ...templateData,
        origin_price: Number(templateData.origin_price),
        price: Number(templateData.price),
        is_enabled: templateData.is_enabled ? 1 : 0,
        imageUrl: templateData.imageUrl ? templateData.imageUrl : 'https://placehold.net/400x400.png', // 新增預設圖片
        imagesUrl: templateData.imagesUrl.filter(url => url && url.trim() !== '')
      }
    };

    const resMsg = modalType === 'create' ? '新增' : '更新';

    try {
      await axios[method](url, productData);

      alert(`產品已成功${resMsg}！`);
      closeModal();
      getProducts();
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error(`產品${resMsg}失敗:`, errMsg);
      alert(`產品${resMsg}失敗`);
    }
  }

  const deleteProduct = async (id) => {
    try {
      await axios.delete(
        `${API_BASE}/api/${API_PATH}/admin/product/${id}`,
      );
      alert('刪除產品成功！')
      closeModal();
      getProducts();
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error('刪除失敗: ', errMsg);
      alert('刪除失敗');
    }
  }

  const checkAdmin = async () => {
    try {
      await axios.post(`${API_BASE}/api/user/check`);
      setIsAuth(true);
    } catch (error) {
      console.error("Token無效或過期: ", error?.response?.data?.message);
      setIsAuth(false);
    }
  };

  const openModal = (type, product) => {
    setModalType(type);

    // 清理 product 內空白圖片
    const cleanedProduct = {
      ...product,
      imagesUrl: (product.imagesUrl || []).filter(
        (url) => url && url.trim() !== ''
      )
    };

    setTemplateData((prev) => ({
      ...prev,
      ...cleanedProduct
    }));

    productModalRef.current.show();
  }
  
  const closeModal = () => {
    productModalRef.current.hide();
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleModalInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setTemplateData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  const handleImageChange = (index, value) => {
    setTemplateData((prev) => {
      const newImagesUrl = [...prev.imagesUrl];
      newImagesUrl[index] = value;

      // 當輸入最後一筆圖片網址時，自動新增一個空白輸入欄
      if (
        value !== '' &&
        index === newImagesUrl.length - 1 &&
        newImagesUrl.length < 5
      ) {
        newImagesUrl.push('');
      }

      // 若清空圖片輸入欄，自動刪除最後一個輸入欄
      if (
        value === '' &&
        newImagesUrl[newImagesUrl.length - 1] === ''
      ) {
        newImagesUrl.pop();
      }

      return {
        ...prev,
        imagesUrl: newImagesUrl,
      };
    })
  }

  const handleAddImage = () => {
    setTemplateData(prev => {
      // 當最後一張副圖有值且副圖數量 < 5 時，才新增空白圖片
      if (prev.imagesUrl[prev.imagesUrl.length - 1] !== '' && 
        prev.imagesUrl.length < 5) {
        return {
          ...prev,
          imagesUrl: [...prev.imagesUrl, ''],
        };
      }
      return prev;
    })
  }

  const handleRemoveImage = () => {
    const newImagesUrl = [...templateData.imagesUrl];

    newImagesUrl.pop();

    setTemplateData((prev) => ({
      ...prev,
      imagesUrl: newImagesUrl
    }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/admin/signin`, formData);
      const {token, expired} = res.data;

      document.cookie = `access_token=${token}; expires=${new Date(expired)};`;
      axios.defaults.headers.common['Authorization'] = token;

      setIsAuth(true);

    } catch (error) {
      setIsAuth(false);
      alert("登入失敗: " + error?.response?.data?.message);
    }
  };

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('access_token='))
      ?.split('=')[1];

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuth(false);
      return;
    }  
    
    axios.defaults.headers.common['Authorization'] = token;
    (async () => {
      try {
        await checkAdmin();
      } catch (error) {
        console.error(error?.response?.data?.message);
      }
    })()
  }, [])

  useEffect(() => {
    if (isAuth) {
      (async () => {
        try {
          await getProducts();
        } catch (error) {
          console.error('取得產品資料失敗: ', error?.response?.data?.message);
        }
      })()
    }
  }, [isAuth])

  useEffect(() => {
    productModalRef.current = new Modal('#productModal', {
      keyboard: false,
    });

    document
      .getElementById('productModal')
      .addEventListener('hide.bs.modal', () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }      
      });

  }, [])

  return (
    <>
      {isAuth ? (
        <div>
          <div className="container">
            <div className="text-end mt-4">
              <button
                className="btn btn-primary"
                onClick={() => openModal('create', INITIAL_TEMPLATE_DATA)}
              >
                建立新的產品
              </button>
            </div>
            <table className="table mt-4">
              <thead>
                <tr>
                  <th width="120">分類</th>
                  <th>產品名稱</th>
                  <th width="120">原價</th>
                  <th width="120">售價</th>
                  <th width="100">是否啟用</th>
                  <th width="120">編輯</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.category}</td>
                    <td>{product.title}</td>
                    <td>{product.origin_price}</td>
                    <td>{product.price}</td>
                    <td>
                      <span
                        className={product.is_enabled ? 'text-success' : ''}
                      >
                        {product.is_enabled ? '啟用' : '未啟用'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openModal('edit', product)}
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => openModal('delete', product)}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="container login">
          <div className="row justify-content-center">
            <h1 className="h3 mb-3 font-weight-normal">請先登入</h1>
            <div className="col-8">
              <form id="form" className="form-signin" onSubmit={handleSubmit}>
                <div className="form-floating mb-3">
                  <input
                    type="email"
                    className="form-control"
                    id="username"
                    placeholder="name@example.com"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    autoFocus
                  />
                  <label htmlFor="username">Email address</label>
                </div>
                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    placeholder="Password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="password">Password</label>
                </div>
                <button
                  className="btn btn-lg btn-primary w-100 mt-3"
                  type="submit"
                >
                  登入
                </button>
              </form>
            </div>
          </div>
          <p className="mt-5 mb-3 text-muted">&copy; 2024~∞ - 六角學院</p>
        </div>
      )}
      <div
        id="productModal"
        className="modal fade"
        tabIndex="-1"
        aria-labelledby="productModalLabel"
        aria-hidden="true"
        ref={productModalRef}
      >
        {modalType === 'delete' ? (
          <div className="modal-dialog modal-xl">
            <div className="modal-content border-0">
              <div className="modal-header bg-danger text-white">
                <h5 id="productModalLabel" className="modal-title">
                  <span>刪除產品</span>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body mt-3">
                <p className="fs-4">
                  確定要刪除
                  <span className="text-danger">{`${templateData.title}`}</span>
                  嗎？
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteProduct(templateData.id)}
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-dialog modal-xl">
            <div className="modal-content border-0">
              <div className="modal-header bg-dark text-white">
                <h5 id="productModalLabel" className="modal-title">
                  <span>{`${modalType === 'create' ? '新增' : '編輯'}產品`}</span>
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-sm-4">
                    <div className="mb-2">
                      <div className="mb-3">
                        <label htmlFor="imageUrl" className="form-label">
                          輸入圖片網址
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="請輸入圖片連結"
                          name="imageUrl"
                          value={templateData.imageUrl}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                      {templateData.imageUrl && (
                        <img
                          className="img-fluid"
                          src={templateData.imageUrl}
                          alt={`${templateData.title}圖片`}
                        />
                      )}
                    </div>
                    {templateData.imagesUrl.map((url, index) => (
                      <div className="mb-2" key={index}>
                        <div className="mb-3">
                          <label htmlFor="imageUrl" className="form-label">
                            輸入圖片網址
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="請輸入圖片連結"
                            value={url}
                            onChange={(e) =>
                              handleImageChange(index, e.target.value)
                            }
                          />
                        </div>
                        {url && (
                          <img
                            className="img-fluid"
                            src={url}
                            alt={`副圖-${index}`}
                          />
                        )}
                      </div>
                    ))}
                    <div>
                      <button
                        className="btn btn-outline-primary btn-sm d-block w-100"
                        onClick={(e) => handleAddImage(e)}
                      >
                        新增圖片
                      </button>
                    </div>
                    <div>
                      <button
                        className="btn btn-outline-danger btn-sm d-block w-100"
                        onClick={(e) => handleRemoveImage(e)}
                      >
                        刪除圖片
                      </button>
                    </div>
                  </div>
                  <div className="col-sm-8">
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">
                        標題
                      </label>
                      <input
                        id="title"
                        type="text"
                        className="form-control"
                        placeholder="請輸入標題"
                        name="title"
                        value={templateData.title}
                        onChange={(e) => handleModalInputChange(e)}
                      />
                    </div>

                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="category" className="form-label">
                          分類
                        </label>
                        <input
                          id="category"
                          type="text"
                          className="form-control"
                          placeholder="請輸入分類"
                          name="category"
                          value={templateData.category}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="unit" className="form-label">
                          單位
                        </label>
                        <input
                          id="unit"
                          type="text"
                          className="form-control"
                          placeholder="請輸入單位"
                          name="unit"
                          value={templateData.unit}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="origin_price" className="form-label">
                          原價
                        </label>
                        <input
                          id="origin_price"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="請輸入原價"
                          name="origin_price"
                          value={templateData.origin_price}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="price" className="form-label">
                          售價
                        </label>
                        <input
                          id="price"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="請輸入售價"
                          name="price"
                          value={templateData.price}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                      </div>
                    </div>
                    <hr />

                    <div className="mb-3">
                      <label htmlFor="description" className="form-label">
                        產品描述
                      </label>
                      <textarea
                        id="description"
                        className="form-control"
                        placeholder="請輸入產品描述"
                        name="description"
                        value={templateData.description}
                        onChange={(e) => handleModalInputChange(e)}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="content" className="form-label">
                        說明內容
                      </label>
                      <textarea
                        id="content"
                        className="form-control"
                        placeholder="請輸入說明內容"
                        name="content"
                        value={templateData.content}
                        onChange={(e) => handleModalInputChange(e)}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          id="is_enabled"
                          name="is_enabled"
                          className="form-check-input"
                          type="checkbox"
                          checked={templateData.is_enabled}
                          onChange={(e) => handleModalInputChange(e)}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="is_enabled"
                        >
                          是否啟用
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  data-bs-dismiss="modal"
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => updateProduct()}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App
