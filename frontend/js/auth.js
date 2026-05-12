async function doLogin() {
  const usuario = document.getElementById('luu').value;
  const password = document.getElementById('lpp').value;

  const r = await api('login', {
    usuario,
    password
  });

  if (!r.ok) {
    alert(r.msg);
    return;
  }

  localStorage.setItem('token', r.token);
  localStorage.setItem('usuario', JSON.stringify(r.usuario));

  location.reload();
}
