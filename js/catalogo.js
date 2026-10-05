import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables globales
let tasaActual = 1, carrito = {}, productosGlobales = [], USER_ID = "", mapaNombresDepto = {}, telefonoEmpresa = "";
let deptoAbierto = null;

function iniciarCatalogo() {
    const urlParams = new URLSearchParams(window.location.search);
    let idDeLaURL = urlParams.get('empresa');
    
    if (idDeLaURL) localStorage.setItem('youcontrol_empresa_id', idDeLaURL);
    USER_ID = idDeLaURL || localStorage.getItem('youcontrol_empresa_id');

    if (!USER_ID) {
        document.getElementById('nombre-empresa').innerText = "ERROR: Empresa no encontrada";
        return;
    }

   // Configuración empresa y logo
onSnapshot(doc(db, "empresas_config", USER_ID), (snap) => {
    const nombreEl = document.getElementById('nombre-empresa');
    const logoImg = document.getElementById('logo-empresa');
    // NUEVA LÍNEA: Capturamos el elemento de dirección
    const dirEl = document.getElementById('direccion-empresa');

    if (snap.exists()) {
        const data = snap.data();
        
        // Bloque de teléfono
        let telLimpio = (data.telefono || "").replace(/-/g, "").replace(/\s/g, "");
        if (telLimpio.startsWith("0")) {
            telLimpio = "58" + telLimpio.substring(1);
        }
        telefonoEmpresa = telLimpio;

        // Nombre
        if (data.nombre) {
            nombreEl.innerText = data.nombre.toUpperCase();
            nombreEl.style.opacity = "1";
        }

        // NUEVA LÍNEA: Actualizamos la dirección en el HTML
        if (dirEl && data.direccion) {
            dirEl.innerText = "📍 " + data.direccion;
        }

        // Logo
        logoImg.src = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${USER_ID}.png?t=${new Date().getTime()}`;
        logoImg.style.display = 'block';
    }
});

    // Tasa BCV
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            const tasaEl = document.getElementById('tasa-cliente');
            if (tasaEl) tasaEl.innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    // Carga de Departamentos (Mapeo de código a nombre)
    onSnapshot(collection(db, "usuarios", USER_ID, "departamentos"), (snap) => {
        mapaNombresDepto = {};
        snap.forEach(d => {
            const data = d.data();
            mapaNombresDepto[d.id] = data.nombre; 
        });
        renderizarCatalogo(productosGlobales);
    });
    
    // Carga de Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    });

    // Buscador
    const buscador = document.getElementById('buscador-prod');
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const busqueda = e.target.value.toLowerCase();
            renderizarCatalogo(productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda)));
        });
    }
}

// Funciones del Carrito (sin cambios)
window.cambiarCant = function(id, cambio, nombre, precio, stock) {
    if (!carrito[id]) {
        if (cambio < 0) return;
        carrito[id] = { nombre: nombre, precio: precio, cantidad: 0 };
    }
    let nuevaCant = carrito[id].cantidad + cambio;
    if (nuevaCant > stock) { alert("¡Stock máximo alcanzado!"); return; }
    if (nuevaCant <= 0) { delete carrito[id]; } 
    else { carrito[id].cantidad = nuevaCant; }
    const qtySpan = document.getElementById(`qty-${id}`);
    if (qtySpan) qtySpan.innerText = carrito[id] ? carrito[id].cantidad : 0;
    window.actualizarFooter();
};

window.actualizarFooter = function() {
    let total = 0, items = 0;
    for (let id in carrito) { 
        total += carrito[id].precio * carrito[id].cantidad; 
        items += carrito[id].cantidad; 
    }
    const footer = document.getElementById('cart-footer');
    if (footer) {
        footer.style.display = items > 0 ? 'flex' : 'none';
        document.getElementById('cart-total-usd').innerText = total.toFixed(2);
        document.getElementById('cart-total-bs').innerText = (total * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        document.getElementById('cart-count').innerText = items;
    }
};

// Bloque a modificar: función enviarPedido
window.enviarPedido = function() {
    if (Object.keys(carrito).length === 0) return;
    let mensaje = "¡Hola! Quisiera realizar el siguiente pedido:\n\n";
    let totalUSD = 0;
    for (let id in carrito) {
        const item = carrito[id];
        const totalItem = item.precio * item.cantidad;
        totalUSD += totalItem;
        mensaje += `• ${item.nombre} x${item.cantidad} ($${item.precio.toFixed(2)}) = $${totalItem.toFixed(2)}\n`;
    }
    mensaje += `\n*TOTAL:* $${totalUSD.toFixed(2)}\n*TOTAL (Bs):* ${(totalUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`;
    
    // Aquí se usa la variable dinámica
    window.open(`https://wa.me/${telefonoEmpresa}?text=${encodeURIComponent(mensaje)}`, '_blank');
};

window.toggleDepto = function(codDepto) {
    deptoAbierto = (deptoAbierto === codDepto) ? null : codDepto;
    renderizarCatalogo(productosGlobales);
};

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    contenedor.style.display = "block";
    const productosFiltrados = lista.filter(p => parseInt(p.stock || 0) > 0);
    
    const agrupados = productosFiltrados.reduce((acc, p) => {
        const cod = p.departamento || 'GENERAL';
        if (!acc[cod]) acc[cod] = [];
        acc[cod].push(p);
        return acc;
    }, {});

    contenedor.innerHTML = Object.keys(agrupados).sort().map((cod) => {
        const nombreMostrado = (mapaNombresDepto[cod] || cod).toUpperCase();
        const esAbierto = deptoAbierto === cod;
        
        // HTML de los productos (solo si está abierto)
        let itemsHTML = "";
        if (esAbierto) {
            itemsHTML = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 0;">` +
            agrupados[cod].map(p => {
                const nombreLimpio = p.nombre.replace(/'/g, "\\'");
                return `
                <div class="card-prod" style="border: 1px solid #E2E8F0; padding: 10px; border-radius: 8px;">
                    <h3 style="font-size:0.9rem; margin:0 0 5px 0;">${p.nombre}</h3>
                    <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;">
                        <span style="font-size: 0.85rem; color: #64748B;">$${parseFloat(p.precio).toFixed(2)} USD</span>
                        <span style="font-weight:900; color:#10B981; font-size:1.1rem;">${(p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <button onclick="window.cambiarCant('${p.id}', -1, '${nombreLimpio}', ${p.precio}, ${p.stock})">-</button>
                        <span id="qty-${p.id}" style="font-weight: bold;">${carrito[p.id]?.cantidad || 0}</span>
                        <button onclick="window.cambiarCant('${p.id}', 1, '${nombreLimpio}', ${p.precio}, ${p.stock})">+</button>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }
        
        // Botón del departamento
        return `
        <div style="width: 100%; margin-top: 10px;">
            <div onclick="window.toggleDepto('${cod}')" style="cursor:pointer; background: #F8FAFC; padding: 15px; border-radius: 8px; font-weight:900; color:#475569; border: 1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;">
                ${nombreMostrado} <span>${esAbierto ? '▲' : '▼'}</span>
            </div>
            ${itemsHTML}
        </div>`;
    }).join('');
}

window.abrirWhatsApp = function() {
    if (telefonoEmpresa && telefonoEmpresa !== "") {
        window.open(`https://wa.me/${telefonoEmpresa}`, '_blank');
    } else {
        alert("El número de contacto aún se está cargando, por favor intenta en un segundo.");
    }
};

document.addEventListener('DOMContentLoaded', iniciarCatalogo);
