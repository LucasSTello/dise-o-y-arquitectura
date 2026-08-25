// Connect to the Socket.io server
const socket = io();

// DOM elements
const productsContainer = document.getElementById('products-container');
const connectionStatus = document.getElementById('connection-status');
const addProductForm = document.getElementById('add-product-form');
const deleteProductForm = document.getElementById('delete-product-form');
const addFormFeedback = document.getElementById('add-form-feedback');
const deleteFormFeedback = document.getElementById('delete-form-feedback');

// Sockets Connection Status Listeners
socket.on('connect', () => {
  connectionStatus.textContent = 'Conectado';
  connectionStatus.className = 'status-indicator connected';
  console.log('Successfully connected to Socket.io server');
});

socket.on('disconnect', () => {
  connectionStatus.textContent = 'Desconectado';
  connectionStatus.className = 'status-indicator disconnected';
  console.warn('Disconnected from Socket.io server');
});

/**
 * Helper function to show form feedback notifications.
 * @param {string} elementId ID of the feedback div.
 * @param {string} message Message text.
 * @param {'success'|'error'} type Type of alert.
 */
function showFeedback(elementId, message, type) {
  const feedbackDiv = document.getElementById(elementId);
  if (!feedbackDiv) return;

  feedbackDiv.textContent = message;
  feedbackDiv.className = `form-feedback show feedback-${type}`;

  // Hide feedback after 4 seconds
  setTimeout(() => {
    feedbackDiv.className = 'form-feedback';
  }, 4000);
}

/**
 * Listen for updateProducts event to dynamically rebuild the product grid
 */
socket.on('updateProducts', (products) => {
  console.log('Received updated products array:', products);
  
  if (!productsContainer) return;

  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📦</span>
        <h3>No hay productos disponibles</h3>
        <p>No se encontraron productos registrados en el sistema en este momento.</p>
      </div>
    `;
    return;
  }

  // Generate cards dynamically
  let html = '';
  products.forEach(p => {
    const prodId = p._id || p.id;
    html += `
      <article class="product-card" data-id="${prodId}">
        <div class="card-header">
          <span class="category-badge">${escapeHtml(p.category)}</span>
          <span class="product-id">ID: #${prodId}</span>
        </div>
        <div class="card-body">
          <h3 class="product-title">${escapeHtml(p.title)}</h3>
          <p class="product-description">${escapeHtml(p.description)}</p>
          <div class="product-meta">
            <span class="meta-item"><strong>Código:</strong> ${escapeHtml(p.code)}</span>
            <span class="meta-item"><strong>Stock:</strong> ${p.stock} u.</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="product-price">$${p.price}</span>
        </div>
      </article>
    `;
  });

  productsContainer.innerHTML = html;
});

/**
 * Handle Add Product form submit
 */
if (addProductForm) {
  addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Extract values
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const code = document.getElementById('code').value.trim();
    const category = document.getElementById('category').value.trim();
    const price = Number(document.getElementById('price').value);
    const stock = Number(document.getElementById('stock').value);

    const productData = {
      title,
      description,
      code,
      category,
      price,
      stock,
      status: true,
      thumbnails: []
    };

    // Emit event with acknowledgement callback
    socket.emit('addProduct', productData, (res) => {
      if (res && res.status === 'success') {
        showFeedback('add-form-feedback', '¡Producto creado y compartido con éxito!', 'success');
        addProductForm.reset();
      } else {
        const errorMsg = res ? res.message : 'Error al guardar el producto.';
        showFeedback('add-form-feedback', `Error: ${errorMsg}`, 'error');
      }
    });
  });
}

/**
 * Handle Delete Product form submit
 */
if (deleteProductForm) {
  deleteProductForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const deleteIdInput = document.getElementById('delete-id');
    const id = deleteIdInput.value.trim();

    if (!id || id.length < 12) {
      showFeedback('delete-form-feedback', 'Por favor ingresa un ID hexadecimal de Mongoose válido (24 caracteres).', 'error');
      return;
    }

    // Emit event with acknowledgement callback
    socket.emit('deleteProduct', id, (res) => {
      if (res && res.status === 'success') {
        showFeedback('delete-form-feedback', '¡Producto eliminado con éxito!', 'success');
        deleteProductForm.reset();
      } else {
        const errorMsg = res ? res.message : 'El ID del producto no existe en la base de datos.';
        showFeedback('delete-form-feedback', `Error: ${errorMsg}`, 'error');
      }
    });
  });
}

/**
 * Helper utility to prevent HTML Injection XSS
 * @param {string} str Unsafe string.
 * @returns {string} Escaped safe HTML string.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
