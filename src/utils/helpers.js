/**
 * Helper to structure standardized API JSON responses.
 * 
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {'success' | 'error'} status - Status string
 * @param {string} message - Description message
 * @param {any} [data=null] - Payload data
 */
export const sendResponse = (res, statusCode, status, message, data = null) => {
  const response = {
    status,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Helper to generate a unique sequential ID based on current items.
 * 
 * @param {Array<object>} items - List of items in database
 * @returns {number} The next sequential integer ID
 */
export const generateId = (items) => {
  if (!items || items.length === 0) {
    return 1;
  }
  const ids = items.map(item => Number(item.id)).filter(id => !isNaN(id));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
};
