import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, writeBatch, doc, getDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let productosLocales = [];
let tasaActual = 1.00;

// --- MOSTRAR ESTADO EN LA BARRA SUPERIOR ---
function mostrarEstado(mensaje, tipo) {
    const bar = document.getElementById('status-bar-inv');
    if (!bar) return;
    bar.className = `status-${tipo}`;
    bar.innerText = mensaje;
    bar.style.display = 'block';
    if (tipo === 'success') {
        setTimeout(() => { bar.style.display = 'none'; }, 3000);
    }
}

// --- CARGAR TASA E INVENTARIO INICIAL ---
async function inicializarInventario() {
    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            const inputTasa = document.getElementById('tasaCambio');
            if (inputTasa) inputTasa.value = tasaActual.toFixed(2);
        }

        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => productosLocales.push({ id: doc.id, ...doc.data() }));
            renderizarTabla(productosLocales);
        });
    } catch (e) {
        console.error("Error al inicializar:", e);
    }
}

// --- RENDERIZAR TABLA CON CORRECCIÓN DE CAMPOS ---
function renderizarTabla(lista) {
    const tbody = document.getElementById('cuerpo-tabla');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No hay productos. Usa "NUEVO ITEM" para empezar.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map((p) => {
        const costo = parseFloat(p.costo) || 0;
        const ganancia = parseFloat(p.ganancia) || 0;
        const precioUSD = p.precio ? parseFloat(p.precio) : (costo + (costo * (ganancia / 100)));
        const precioBS = precioUSD * tasaActual;

        // CORRECCIÓN CLAVE: Asegurar la lectura exacta de minúsculas desde Firestore
        const codigoBarras = p.barras || p.codigo || ''; 
        const codigoSku = p.sku || p.SKU || '';

        return `
            <tr data-id="${p.id || ''}" class="fila-producto">
                <td><input type="text" class="input-table p-barras" value="${codigoBarras}"></td>
                <td><input type="text" class="input-table p-sku" value="${codigoSku}"></td>
                <td><input type="text" class="input-table p-nombre" value="${p.nombre || ''}" required></td>
                <td><input type="number" step="0.01" class="input-table p-costo" value="${costo.toFixed(2)}" oninput="window.calcularPreciosFila(this)"></td>
                <td><input type="number" step="0.1" class="input-table p-ganancia" value="${ganancia.toFixed(1)}" oninput="window.calcularPreciosFila(this)"></td>
                <td><input type="number" step="0.01" class="input-table p-precio-usd" value="${precioUSD.toFixed(2)}" oninput="window.calcularGananciaFila(this)"></td>
                <td><input type="text" class="input-table p-precio-bs" value="${precioBS.toFixed(2).replace('.', ',')} Bs." readonly></td>
                <td><input type="number" class="input-table p-stock" value="${p.stock || 0}"></td>
                <td style="text-align: center;">
                    <button class="btn-remove" onclick="window.eliminarFila(this, '${p.id || ''}')">
                        <i class="fas fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// --- ACCIÓN: AGREGAR NUEVA FILA AL INICIO ---
window.agregarFila = () => {
    const tbody = document.getElementById('cuerpo-tabla');
    if (!tbody) return;

    if (tbody.innerHTML.includes("No hay productos") || tbody.innerHTML.includes("Cargando")) {
        tbody.innerHTML = '';
    }

    const nuevaFila = document.createElement('tr');
    nuevaFila.setAttribute('data-id', '');
    nuevaFila.className = 'fila-producto';
    nuevaFila.innerHTML = `
        <td><input type="text" class="input-table p-barras" value=""></td>
        <td><input type="text" class="input-table p-sku" value=""></td>
        <td><input type="text" class="input-table p-nombre" value="" placeholder="Nuevo Artículo..." required></td>
        <td><input type="number" step="0.01" class="input-table p-costo" value="0.00" oninput="window.calcularPreciosFila(this)"></td>
        <td><input type="number" step="0.1" class="input-table p-ganancia" value="0.0" oninput="window.calcularPreciosFila(this)"></td>
        <td><input type="number" step="0.01" class="input-table p-precio-usd" value="0.00" oninput="window.calcularGananciaFila(this)"></td>
        <td><input type="text" class="input-table p-precio-bs" value="0,00 Bs." readonly></td>
        <td><input type="number" class="input-table p-stock" value="0"></td>
        <td style="text-align: center;">
            <button class="btn-remove" onclick="window.eliminarFila(this, '')">
                <i class="fas fa-trash-can"></i>
            </button>
        </td>
    `;

    tbody.insertBefore(nuevaFila, tbody.firstChild);
    nuevaFila.querySelector('.p-nombre').focus();
};

// --- CÁLCULOS INTERNOS ---
window.calcularPreciosFila = (input) => {
    const fila = input.closest('tr');
    const costo = parseFloat(fila.querySelector('.p-costo').value) || 0;
    const ganancia = parseFloat(fila.querySelector('.p-ganancia').value) || 0;
    
    const precioUSD = costo + (costo * (ganancia / 100));
    const precioBS = precioUSD * tasaActual;

    fila.querySelector('.p-precio-usd').value = precioUSD.toFixed(2);
    fila.querySelector('.p-precio-bs').value = precioBS.toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularGananciaFila = (input) => {
    const fila = input.closest('tr');
    const costo = parseFloat(fila.querySelector('.p-costo').value) || 0;
    const precioUSD = parseFloat(fila.querySelector('.p-precio-usd').value) || 0;

    let ganancia = 0;
    if (costo > 0) {
        ganancia = ((precioUSD - costo) / costo) * 100;
    }

    fila.querySelector('.p-ganancia').value = ganancia.toFixed(1);
    fila.querySelector('.p-precio-bs').value = (precioUSD * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.actualizarPreciosBS = () => {
    const inputTasa = document.getElementById('tasaCambio');
    tasaActual = parseFloat(inputTasa.value) || 1.00;

    const filas = document.querySelectorAll('.fila-producto');
    filas.forEach(fila => {
        const precioUSD = parseFloat(fila.querySelector('.p-precio-usd').value) || 0;
        fila.querySelector('.p-precio-bs').value = (precioUSD * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
    });
};

window.eliminarFila = async (btn, id) => {
    if (!confirm("¿Desear remover este item? (Los cambios permanentes se aplican al Guardar Todo)")) return;
    btn.closest('tr').remove();
};

// --- GUARDAR TODO EN BATCH ---
window.guardarInventario = async () => {
    const btnGuardar = document.getElementById('btnGuardarTodo');
    btnGuardar.disabled = true;
    mostrarEstado("⏳ Guardando cambios de inventario en masa...", "loading");

    try {
        const batch = writeBatch(db);
        const filas = document.querySelectorAll('.fila-producto');

        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        batch.set(tasaRef, { valor: tasaActual });

        filas.forEach(fila => {
            const id = fila.getAttribute('data-id');
            const nombre = fila.querySelector('.p-nombre').value.trim();
            if (!nombre) return; 

            const datosProducto = {
                barras: fila.querySelector('.p-barras').value.trim(),
                sku: fila.querySelector('.p-sku').value.trim(),
                nombre: nombre,
                costo: parseFloat(fila.querySelector('.p-costo').value) || 0,
                ganancia: parseFloat(fila.querySelector('.p-ganancia').value) || 0,
                precio: parseFloat(fila.querySelector('.p-precio-usd').value) || 0,
                stock: parseInt(fila.querySelector('.p-stock').value) || 0
            };

            let docRef;
            if (id) {
                docRef = doc(db, "usuarios", USER_ID, "productos", id);
                batch.set(docRef, datosProducto, { merge: true });
            } else {
                docRef = doc(collection(db, "usuarios", USER_ID, "productos"));
                batch.set(docRef, datosProducto);
            }
        });

        await batch.commit();
        mostrarEstado("✅ ¡Inventario y tasa guardados perfectamente!", "success");
    } catch (e) {
        mostrarEstado("❌ Error al procesar guardado masivo.", "loading");
        console.error(e);
    } finally {
        btnGuardar.disabled = false;
    }
};

window.forzarSincronizacion = async () => {
    mostrarEstado("🔄 Sincronizando datos con el servidor...", "loading");
    try {
        const snapshot = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
        productosLocales = [];
        snapshot.forEach(doc => productosLocales.push({ id: doc.id, ...doc.data() }));
        renderizarTabla(productosLocales);
        mostrarEstado("✅ Sincronización completa", "success");
    } catch (e) {
        mostrarEstado("❌ Error de refresco masivo", "loading");
    }
};

window.filtrarProductos = () => {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const filas = document.querySelectorAll('.fila-producto');

    filas.forEach(fila => {
        const barras = fila.querySelector('.p-barras').value.toLowerCase();
        const sku = fila.querySelector('.p-sku').value.toLowerCase();
        const nombre = fila.querySelector('.p-nombre').value.toLowerCase();

        if (barras.includes(busqueda) || sku.includes(busqueda) || nombre.includes(busqueda)) {
            fila.classList.remove('oculto');
        } else {
            fila.classList.add('oculto');
        }
    });
};

inicializarInventario();
