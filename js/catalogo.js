import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db as dbDefault } from './firebase-config.js';

// Mapa de configuraciones para proyectos independientes de Firebase
const CONFIGS_PROYECTOS = {
    "YC-20261012-TORACA": {
        projectId: "yc-toraca",
        authDomain: "yc-toraca.firebaseapp.com",
        storageBucket: "yc-toraca.firebasestorage.app"
    }
};

let db = dbDefault;
let tasaActual = 1, carrito = {}, productosGlobales = [], USER_ID = "", mapaNombresDepto = {}, telefonoEmpresa = "";
let deptoAbierto = null;

function obtenerEmpresaIDDeURL() {
    const query = window.location.search;
    if (!query) return null;

    const match = query.match(/[?&](empresa|u)=([^&]*)/);
    if (match && match[2]) {
        let rawId = match[2];
        try {
            return decodeURIComponent(rawId.trim());
        } catch(e) {
            return rawId.trim();
        }
    }
    return null;
}

function inicializarFirebaseEmpresa(empresaID) {
    // Si la empresa tiene un proyecto de Firebase dedicado
    const projConfig = CONFIGS_PROYECTOS[empresaID] || (empresaID.includes("TORACA") ? CONFIGS_PROYECTOS["YC-20261012-TORACA"] : null);

    if (projConfig) {
        const fullConfig = {
            apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q", // Usa la API Key global autorizada
            authDomain: projConfig.authDomain,
            projectId: projConfig.projectId,
            storageBucket: projConfig.storageBucket
        };

        const appName = "app_tenant_" + projConfig.projectId;
        let tenantApp;
        const appsExistentes = getApps();
        const appEncontrada = appsExistentes.find(a => a.name === appName);

        if (appEncontrada) {
            tenantApp = appEncontrada;
        } else {
            tenantApp = initializeApp(fullConfig, appName);
        }
        db = getFirestore(tenantApp);
    }
}

function iniciarCatalogo() {
    let idDeLaURL = obtenerEmpresaIDDeURL();
    
    if (idDeLaURL) {
        localStorage.setItem('youcontrol_empresa_id', idDeLaURL);
    }
    USER_ID = idDeLaURL || localStorage.getItem('youcontrol_empresa_id');

    if (!USER_ID) {
        const nombreEl = document.getElementById('nombre-empresa');
        if (nombreEl) nombreEl.innerText = "ERROR: Empresa no encontrada";
        return;
    }

    // Inicializar la conexión a la base de datos correcta según el cliente
    inicializarFirebaseEmpresa(USER_ID);

    function aplicarDatosEmpresa(data) {
        const nombreEl = document.getElementById('nombre-empresa');
        const logoImg = document.getElementById('logo-empresa');
        const dirEl = document.getElementById('direccion-empresa');

        let nombreNegocio = data ? (data.nombre || data.empresa || data.nombre_empresa || data.razon_social) : null;
        if (!nombreNegocio) {
            nombreNegocio = USER_ID.replace(/-/g, ' ').toUpperCase();
        }

        if (nombreEl) {
            nombreEl.innerText = nombreNegocio;
            nombreEl.style.opacity = "1";
        }

        let direccionNegocio = data ? (data.direccion || data.ubicacion || data.dir) : null;
        if (dirEl) {
            dirEl.innerText = direccionNegocio ? ("📍 " + direccionNegocio) : "📍 Barquisimeto, Lara";
        }

        let telLimpio = data ? (data.telefono || data.tlf || data.whatsapp || "").toString().replace(/-/g, "").replace(/\s/g, "") : "";
        if (telLimpio.startsWith("0")) {
            telLimpio = "58" + telLimpio.substring(1);
        }
        telefonoEmpresa = telLimpio;

        if (logoImg) {
            logoImg.src = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${encodeURIComponent(USER_ID)}.png?t=${new Date().getTime()}`;
            logoImg.style.display = 'block';
        }
    }

    function procesarTasa(tasaRaw) {
        if (!tasaRaw) return;
        tasaActual = parseFloat(String(tasaRaw).replace(',', '.')) || 1;
        const tasaEl = document.getElementById('tasa-cliente');
        if (tasaEl) tasaEl.innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
        renderizarCatalogo(productosGlobales);
    }

    // 1. Escuchar datos del usuario en la base de datos seleccionada
    onSnapshot(doc(db, "usuarios", USER_ID), (snapUser) => {
        if (snapUser.exists()) {
            const data = snapUser.data();
            aplicarDatosEmpresa(data);
            if (data.tasa_bcv || data.tasa) {
                procesarTasa(data.tasa_bcv || data.tasa);
            }
        } else {
            aplicarDatosEmpresa(null);
        }
    });

    // 2. Carga de Departamentos
    onSnapshot(collection(db, "usuarios", USER_ID, "departamentos"), (snap) => {
        mapaNombresDepto = {};
        snap.forEach(d => {
            const data = d.data();
            mapaNombresDepto[d.id] = data.nombre || data.descripcion; 
        });
        renderizarCatalogo(productosGlobales);
    });
    
    // 3. Carga de Productos (CAR-01, CAR-02, CAR-03...)
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: String(d.id), ...d.data() }));
        renderizarCatalogo(productosGlobales);
    });

    // 4. Buscador
    const buscador = document.getElementById('buscador-prod');
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const busqueda = e.target.value.toLowerCase().trim();
            renderizarCatalogo(productosGlobales.filter(p => (p.nombre || "").toLowerCase().includes(busqueda)));
        });
    }

    // 5. Botones de cantidad
    const contenedor = document.getElementById('contenedor-catalogo');
    if (contenedor) {
        contenedor.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-cant');
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            const cambio = parseInt(btn.getAttribute('data-cambio'));
            
            const nombre = decodeURIComponent(btn.getAttribute('data-nombre') || '');
            const precio = parseFloat(btn.getAttribute('data-precio'));
            const stock = parseInt(btn.getAttribute('data-stock'));

            modificarCantidad(id, cambio, nombre, precio, stock);
        });
    }
}

function modificarCantidad(id, cambio, nombre, precio, stock) {
    const pID = String(id);
    const precioLimpio = parseFloat(precio) || 0;
    const stockLimpio = parseInt(stock) || 0;

    if (!carrito[pID]) {
        if (cambio < 0) return;
        carrito[pID] = { nombre: nombre, precio: precioLimpio, cantidad: 0 };
    }
    
    let nuevaCant = carrito[pID].cantidad + cambio;
    if (nuevaCant > stockLimpio) { 
        alert("¡Stock máximo alcanzado!"); 
        return; 
    }
    
    if (nuevaCant <= 0) { 
        delete carrito[pID]; 
    } else { 
        carrito[pID].cantidad = nuevaCant;
        carrito[pID].precio = precioLimpio;
    }
    
    const qtySpan = document.querySelector(`span[data-qty-id="${CSS.escape(pID)}"]`);
    if (qtySpan) {
        qtySpan.innerText = carrito[pID] ? carrito[pID].cantidad : 0;
    }
    
    actualizarFooter();
}

function actualizarFooter() {
    let total = 0, items = 0;
    for (let id in carrito) { 
        const pUSD = parseFloat(carrito[id].precio) || 0;
        const cant = parseInt(carrito[id].cantidad) || 0;
        total += pUSD * cant; 
        items += cant; 
    }
    const footer = document.getElementById('cart-footer');
    if (footer) {
        footer.style.display = items > 0 ? 'flex' : 'none';
        document.getElementById('cart-total-usd').innerText = total.toFixed(2);
        document.getElementById('cart-total-bs').innerText = (total * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        document.getElementById('cart-count').innerText = items;
    }
}

window.enviarPedido = function() {
    if (Object.keys(carrito).length === 0) return;
    let mensaje = "¡Hola! Quisiera realizar el siguiente pedido:\n\n";
    let totalUSD = 0;
    for (let id in carrito) {
        const item = carrito[id];
        const pUSD = parseFloat(item.precio) || 0;
        const cant = parseInt(item.cantidad) || 0;
        const totalItem = pUSD * cant;
        totalUSD += totalItem;
        mensaje += `• ${item.nombre} x${cant} ($${pUSD.toFixed(2)}) = $${totalItem.toFixed(2)}\n`;
    }
    mensaje += `\n*TOTAL:* $${totalUSD.toFixed(2)}\n*TOTAL (Bs):* ${(totalUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`;
    
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
        
        let itemsHTML = "";
        if (esAbierto) {
            itemsHTML = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px 0;">` +
            agrupados[cod].map(p => {
                const precioNum = parseFloat(String(p.precio).replace(',', '.')) || 0;
                const stockNum = parseInt(p.stock) || 0;
                const prodID = String(p.id);

                return `
                <div class="card-prod">
                    <h3 style="font-size:0.9rem; margin:0 0 5px 0;">${p.nombre || 'Producto'}</h3>
                    <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;">
                        <span style="font-size: 0.85rem; color: #64748B;">$${precioNum.toFixed(2)} USD</span>
                        <span style="font-weight:900; color:#006AFF; font-size:1.1rem;">${(precioNum * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <button class="btn-cant" data-id="${prodID}" data-cambio="-1" data-nombre="${encodeURIComponent(p.nombre || '')}" data-precio="${precioNum}" data-stock="${stockNum}">-</button>
                        <span data-qty-id="${prodID}" style="font-weight: bold;">${carrito[prodID]?.cantidad || 0}</span>
                        <button class="btn-cant" data-id="${prodID}" data-cambio="1" data-nombre="${encodeURIComponent(p.nombre || '')}" data-precio="${precioNum}" data-stock="${stockNum}">+</button>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }
        
        return `
        <div style="width: 100%; margin-top: 10px;">
            <div onclick="window.toggleDepto('${cod}')" style="cursor:pointer; background: #FFFFFF; padding: 15px; border-radius: 14px; font-weight:800; color:#0F172A; border: 1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
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
