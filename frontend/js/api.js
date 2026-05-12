const API_URL = "https://script.google.com/macros/s/AKfycbyXC6EOgIQW4btapv4FJ2QYYgjNvyj7F4I20E5xugEuwyXd16SQKjS0DAJnKzyqjtaT/exec";

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
