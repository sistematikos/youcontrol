import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function iniciarCatalogo() {
    // 1. CAPTURA DEL ID (Prioridad: URL > localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    let idDeLaURL = urlParams.get('empresa');
    
    if (idDeLaURL) localStorage.setItem('youcontrol_empresa_id', idDeLaURL);
    const USER_ID = idDeLaURL || localStorage.getItem('youcontrol_empresa_id');

    if (!USER_ID) {
        document.getElementById('nombre-empresa').innerText = "ERROR: Empresa no encontrada";
        return;
    }

    let tasaActual = 1, carrito = {}, productosGlobales = [];

    // --- CARGA DE LOGO Y NOMBRE ---
    onSnapshot(doc(db, "empresas_config", USER_ID), (snap) => {
        const nombreEl = document.getElementById('nombre-empresa');
        const logoImg = document.getElementById('logo-empresa');
        if (snap.exists()) {
            const data = snap.data();
            if (data.nombre) {
                nombreEl.innerText = data.nombre.toUpperCase();
                nombreEl.style.opacity = "1";
                nombreEl.style.transition = "opacity 0.3s";
            }
            logoImg.src = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${USER_ID}.png?t=${new Date().getTime()}`;
            logoImg.style.display = 'block';
        }
    });

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

    // --- FUNCIONES GLOBALES ---
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

    window.enviarPedido = function() {
        if (Object.keys(carrito).length === 0) return;
        let mensaje = "¡Hola! Quisiera realizar el siguiente pedido:\n\n";
        let totalUSD = 0;
        for (let id in carrito) {
            const item = carrito[id];
            const subtotal = item.precio * item.cantidad;
            totalUSD += subtotal;
            mensaje += `• ${item.nombre} x${item.cantidad} ($${item.precio.toFixed(2)} c/u) = $${subtotal.toFixed(2)}\n`;
        }
        mensaje += `\n*TOTAL:* $${totalUSD.toFixed(2)}\n*TOTAL (Bs):* ${(totalUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`;
        window.open(`https://wa.me/584264570267?text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    const coloresDepartamentos = { 
        'PARTES ELECTRICAS': '#F59E0B', 
        'BEBIDAS': '#3B82F6', 
        'ALIMENTOS': '#10B981', 
        'REPUESTOS': '#EF4444' 
    };

    contenedor.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => {
        const depto = p.departamento ? p.departamento.trim().toUpperCase() : 'GENERAL';
        const colorBorde = coloresDepartamentos[depto] || '#64748B';
        const nombreLimpio = p.nombre.replace(/'/g, "\\'");
        
        return `
        <div class="card-prod" style="border-left: 6px solid ${colorBorde}; border: 1px solid #E2E8F0; padding: 10px; margin-bottom: 10px; border-radius: 8px;">
            <h3 style="font-size:0.9rem; margin:0 0 5px 0;">${p.nombre}</h3>
            
            <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;">
                <span style="font-size: 0.85rem; color: #64748B;">$${parseFloat(p.precio).toFixed(2)} USD</span>
                
                <span style="font-weight:900; color:#10B981; font-size:1.1rem;">
                    ${(p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                </span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button onclick="window.cambiarCant('${p.id}', -1, '${nombreLimpio}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}" style="font-weight: bold;">${carrito[p.id]?.cantidad || 0}</span>
                <button onclick="window.cambiarCant('${p.id}', 1, '${nombreLimpio}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', iniciarCatalogo);
