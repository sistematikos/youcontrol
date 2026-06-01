import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const token = localStorage.getItem('licencia_youcontrol');
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let tasaActual = 1, carrito = {}, productosGlobales = [];

function iniciarCatalogo() {
    if (!USER_ID) return;

    // --- CARGA DE LOGO Y NOMBRE ---
    onSnapshot(doc(db, "empresas_config", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            if (data.nombre) document.getElementById('nombre-empresa').innerText = data.nombre.toUpperCase();
            
            const logoImg = document.getElementById('logo-empresa');
            if (logoImg) {
                logoImg.src = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${USER_ID}.png`;
                logoImg.style.display = 'block';
                logoImg.onerror = () => { logoImg.style.display = 'none'; };
            }
        }
    });

    // --- RESPALDO DE NOMBRE ---
    if (token) {
        try {
            const data = JSON.parse(atob(token));
            const nombreEl = document.getElementById('nombre-empresa');
            if (nombreEl.innerText === "CARGANDO..." || nombreEl.innerText === "") {
                nombreEl.innerText = (data.n || "EMPRESA").toUpperCase();
            }
        } catch(e) {}
    }

    // --- CARGA DE TASA ---
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    // --- CARGA DE PRODUCTOS ---
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    });

    document.getElementById('buscador-prod').addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        renderizarCatalogo(productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda)));
    });
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    // Función para asignar color según el campo "departamento" de Firestore
    const getBorderColor = (depto) => {
        const colores = {
            'PARTES ELECTRICAS': '#F59E0B',  // Color para este departamento
            'REPUESTOS': '#EF4444',          // Ejemplo para otro
            'GENERAL': '#10B981'             // Verde por defecto
        };
        // Convertimos a mayúsculas para asegurar coincidencia
        const deptoKey = depto ? depto.toUpperCase() : 'GENERAL';
        return colores[deptoKey] || '#10B981';
    };

    contenedor.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => `
        <div class="card-prod" style="border-left: 6px solid ${getBorderColor(p.departamento)}">
            <h3 style="font-size:0.85rem; margin:0;">${p.nombre}</h3>
            <span style="font-weight:900; color:#10B981; font-size:1.1rem;">
                ${(p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
            </span>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`).join('');
}

function actualizarFooter() {
    let total = 0, items = 0;
    for (let id in carrito) { total += carrito[id].precio * carrito[id].cantidad; items += carrito[id].cantidad; }
    document.getElementById('cart-footer').style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = total.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (total * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    document.getElementById('cart-count').innerText = items;
}

document.addEventListener('DOMContentLoaded', iniciarCatalogo);
