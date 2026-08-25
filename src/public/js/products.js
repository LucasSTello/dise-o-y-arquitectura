// Client-side script for Catalog view

document.addEventListener('DOMContentLoaded', () => {
  // Ensure we have a shopping cart created in localStorage
  initCart();

  // Add click listeners to all "Comprar" buttons
  setupAddToCartButtons();
});

/**
 * Checks if a cart ID is stored in localStorage.
 * If not, requests a new cart from the API and saves its ID.
 */
async function initCart() {
  let cartId = localStorage.getItem('cartId');
  
  if (!cartId) {
    try {
      console.log('[Cart] No se encontró ID de carrito local. Creando uno nuevo...');
      const response = await fetch('/api/carts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.status === 'success' && result.data && result.data._id) {
        cartId = result.data._id;
        localStorage.setItem('cartId', cartId);
        console.log(`[Cart] Nuevo carrito inicializado localmente con ID: ${cartId}`);
        updateCartNavbarLink(cartId);
      } else {
        console.error('[Cart Error] No se pudo crear el carrito remoto:', result.message);
      }
    } catch (error) {
      console.error('[Cart Error] Error de red al inicializar carrito:', error.message);
    }
  } else {
    console.log(`[Cart] Carrito cargado de localStorage con ID: ${cartId}`);
    updateCartNavbarLink(cartId);
  }
}

/**
 * Dynamically updates the navbar "Carrito" link to point to the user's active cart.
 * @param {string} cartId - The active cart ObjectId
 */
function updateCartNavbarLink(cartId) {
  const cartLink = document.getElementById('navbar-cart-link');
  if (cartLink) {
    cartLink.setAttribute('href', `/carts/${cartId}`);
  }
}

/**
 * Sets up click event handlers for all "Comprar" buttons in the catalog.
 */
function setupAddToCartButtons() {
  const buttons = document.querySelectorAll('.add-to-cart-btn');
  
  buttons.forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const pid = button.getAttribute('data-id');
      const cartId = localStorage.getItem('cartId');
      
      if (!cartId) {
        showToast('Error: El carrito no ha sido inicializado. Reintente.', 'error');
        await initCart();
        return;
      }

      // Disable button during network call
      button.disabled = true;
      button.classList.add('loading');
      
      try {
        const response = await fetch(`/api/carts/${cartId}/product/${pid}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
          showToast('¡Producto agregado al carrito con éxito!', 'success');
        } else {
          showToast(`Error: ${result.message}`, 'error');
        }
      } catch (error) {
        showToast(`Error de conexión: ${error.message}`, 'error');
      } finally {
        button.disabled = false;
        button.classList.remove('loading');
      }
    });
  });
}

/**
 * Displays a nice popup toast notification in the UI.
 * @param {string} message - Notification text
 * @param {'success'|'error'} type - Alert type
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('cart-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type === 'success' ? 'toast-success' : 'toast-error'}`;

  // Hide toast after 3.5 seconds
  setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}
