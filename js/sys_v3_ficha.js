import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaFiltrada = [];

document.getElementById('buscador-prod').addEventListener('input', async (e) => {
    const term = e.target.value.toLowerCase();
    if (term.length < 2) { document.getElementById('lista-resultados').style.display = 'none'; return; }
    const snap = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaFiltrada = [];
    snap.forEach(d => {
        const data = d.data();
        if (data.nombre.toLowerCase().includes(term)) listaFiltrada.push({ id: d.id, ...data });
    });
    
    const list = document.getElementById('lista-resultados');
    list.style.display = 'block';
    list.innerHTML = listaFiltrada.map((p, i) => `<div class="item-res" onclick="window.cargarProducto(${i})">${p.nombre}</div>`).join('');
});

window.cargarProducto = (i) => {
    const p = listaFiltrada[i];
    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    document.getElementById('prod-depto').value = p.departamento || "";
    document.getElementById('lista-resultados').style.display = 'none';
};

window.guardarProducto = async function() {
    const sku = document.getElementById('prod-sku').value.trim();
    if (!sku) return alert("El SKU es obligatorio");

    const data = {
        sku: sku,
        nombre: document.getElementById('prod-nombre').value,
        barras: document.getElementById('prod-barras').value,
        costo: parseFloat(document.getElementById('prod-costo').value || 0),
        ganancia: parseFloat(document.getElementById('prod-ganancia').value || 0),
        precio: parseFloat(document.getElementById('prod-precio').value || 0),
        stock: parseInt(document.getElementById('prod-stock').value || 0),
        departamento: document.getElementById('prod-depto').value.toUpperCase()
    };

    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), data);
        alert("¡Producto guardado correctamente!");
    } catch (e) { alert("Error: " + e.message); }
};
