const API_URL = "https://script.google.com/macros/s/AKfycbwd3Gcr8AwTPItmWuVWAh10sCAwtNAyNZE5eT9cGvQHYf5jLPS-i9bsArOQ8ZxAUP_E/exec";

async function api(action, payload = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: localStorage.getItem('token'),
        accion: action,
        payload
      })
    });

    return await response.json();
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      msg: err.message
    };
  }
}
