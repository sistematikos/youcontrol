import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let productosLocales = [];
let tasaActual = 1.00;

function mostrarEstado(mensaje, tipo) {
    const bar = document.getElementById('status-bar-inv');
    if (!bar) return;
    bar.className = `status-${tipo}`;
    bar.innerText = mensaje;
    bar.style.display = 'block';
    if (tipo === 'success') setTimeout(() => { bar.style.display = 'none'; }, 3000);
}

async function inicializarInventario() {
    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            document.getElementById('tasaCambio').value = tasaActual.toFixed(2);
        }

        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => productosLocales.push({ id: doc.id, ...doc.data() }));
            renderizarTabla(productosLocales);
        });
    } catch (e) { 
        console.error("Error al inicializar la base de datos de consulta:", e); 
    }
}

function renderizarTabla(lista) {
    const tbody = document.getElementById('cuerpo-tabla');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#64748B;">No se encontraron artículos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map((p) => {
        const costo = parseFloat(p.costo) || 0;
        const ganancia = parseFloat(p.ganancia) || 0;
        const precioUSD = p.precio ? parseFloat(p.precio) : (costo + (costo * (ganancia / 100)));
        const precioBS = precioUSD * tasaActual;

        return `
            <tr class="fila-producto" data-id="${p.id}">
                <td class="td-barras">${p.barras || ''}</td>
                <td class="td-sku">${p.sku || ''}</td>
                <td class="td-nombre txt-bold">${p.nombre || ''}</td>
                <td>$${costo.toFixed(2)}</td>
                <td>${ganancia.toFixed(1)}%</td>
                <td class="txt-bold">$${precioUSD.toFixed(2)}</td>
                <td><span class="badge-bs">${precioBS.toFixed(2).replace('.', ',')} Bs.</span></td>
                <td><span class="badge-stock">${p.stock || 0}</span></td>
                <td style="text-align: center;">
                    <button class="btn-edit" onclick="window.abrirModalEditar('${p.id}')" title="Editar Ficha"><i class="fas fa-pen"></i></button>
                    <button class="btn-remove" onclick="window.eliminarProducto('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

window.abrirModalNuevo = () => {
    document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-plus"></i> Registrar Nuevo Artículo';
    document.getElementById('form-id').value = '';
    document.getElementById('form-barras').value = '';
    document.getElementById('form-sku').value = '';
    document.getElementById('form-sku').disabled = false;
    document.getElementById('form-nombre').value = '';
    document.getElementById('form-costo').value = '0.00';
    document.getElementById('form-ganancia').value = '0.0';
    document.getElementById('form-precio').value = '0.00';
    document.getElementById('form-stock').value = '0';
    
    document.getElementById('modalProducto').style.display = 'flex';
    document.getElementById('form-sku').focus();
};

window.abrirModalEditar = (id) => {
    const prod = productosLocales.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-pen"></i> Modificar Producto';
    document.getElementById('form-id').value = prod.id;
    document.getElementById('form-barras').value = prod.barras || '';
    document.getElementById('form-sku').value = prod.sku || '';
    document.getElementById('form-sku').disabled = true; 
    document.getElementById('form-nombre').value = prod.nombre || '';
    document.getElementById('form-costo').value = (prod.costo || 0).toFixed(2);
    document.getElementById('form-ganancia').value = (prod.ganancia || 0).toFixed(1);
    document.getElementById('form-precio').value = (prod.precio || 0).toFixed(2);
    document.getElementById('form-stock').value = prod.stock || 0;

    document.getElementById('modalProducto').style.display = 'flex';
    document.getElementById('form-nombre').focus();
};

window.cerrarModal = () => {
    document.getElementById('modalProducto').style.display = 'none';
    document.getElementById('form-sku').disabled = false;
};

window.calcularPrecioModal = () => {
    const costo = parseFloat(document.getElementById('form-costo').value) || 0;
    const ganancia = parseFloat(document.getElementById('form-ganancia').value) || 0;
    document.getElementById('form-precio').value = (costo + (costo * (ganancia / 100))).toFixed(2);
};

window.calcularGananciaModal = () => {
    const costo = parseFloat(document.getElementById('form-costo').value) || 0;
    const precio = parseFloat(document.getElementById('form-precio').value) || 0;
    if (costo > 0) {
        document.getElementById('form-ganancia').value = (((precio - costo) / costo) * 100).toFixed(1);
    }
};

window.guardarCambiosModal = async () => {
    const idExistente = document.getElementById('form-id').value;
    const nombre = document.getElementById('form-nombre').value.trim();
    const sku = document.getElementById('form-sku').value.trim();
    const barras = document.getElementById('form-barras').value.trim();

    if (!nombre) { alert("La descripción del producto es obligatoria."); return; }

    mostrarEstado("⏳ Sincronizando cambios en Firebase...", "loading");

    const datos = {
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: parseFloat(document.getElementById('form-costo').value) || 0,
        ganancia: parseFloat(document.getElementById('form-ganancia').value) || 0,
        precio: parseFloat(document.getElementById('form-precio').value) || 0,
        stock: parseInt(document.getElementById('form-stock').value) || 0
    };

    try {
        const idDocumento = idExistente || sku || barras || doc(collection(db, "temp")).id;
        await setDoc(doc(db, "usuarios", USER_ID, "productos", idDocumento), datos, { merge: true });
        
        window.cerrarModal();
        mostrarEstado("✅ Modificación guardada exitosamente.", "success");
    } catch (e) {
        console.error(e);
        mostrarEstado("❌ No se pudo guardar la información.", "loading");
    }
};

window.eliminarProducto = async (id) => {
    if (!confirm("¿Seguro que deseas eliminar permanentemente este producto de la DB?")) return;
    try {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
        mostrarEstado("✅ El producto ha sido removido de la base de datos.", "success");
    } catch(e) { console.error(e); }
};

window.actualizarTasaTop = async () => {
    tasaActual = parseFloat(document.getElementById('tasaCambio').value) || 1.00;
    renderizarTabla(productosLocales);
};

window.filtrarProductos = () => {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const filas = document.querySelectorAll('.fila-producto');
    filas.forEach(fila => {
        const barras = fila.querySelector('.td-barras').innerText.toLowerCase();
        const sku = fila.querySelector('.td-sku').innerText.toLowerCase();
        const nombre = fila.querySelector('.td-nombre').innerText.toLowerCase();
        
        if (barras.includes(busqueda) || sku.includes(busqueda) || nombre.includes(busqueda)) {
            fila.classList.remove('oculto');
        } else {
            fila.classList.add('oculto');
        }
    });
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        const modal = document.getElementById('modalProducto');
        if (modal.style.display === 'flex') {
            e.preventDefault();
            window.guardarCambiosModal();
        }
    }
});

inicializarInventario();
