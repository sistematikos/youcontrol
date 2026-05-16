import { db } from './firebase-config.js';
import { 
    doc, getDoc, setDoc, collection, getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1.00;

function mostrarEstado(mensaje, tipo) {
    const bar = document.getElementById('status-bar-comp');
    if (!bar) return;
    bar.className = `status-${tipo}`;
    bar.innerText = mensaje;
    bar.style.display = 'block';
    if (tipo === 'success') setTimeout(() => { bar.style.display = 'none'; }, 4000);
}

// Inicializar Tasa y colocar fecha de hoy por defecto
async function inicializarModulo() {
    // 1. Colocar fecha actual en el input
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('comp-fecha').value = hoy;

    try {
        // 2. Obtener la tasa de cambio actual de la DB
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            document.getElementById('txt-tasa').innerText = tasaActual.toFixed(2).replace('.', ',');
        }
    } catch (e) {
        console.error("Error cargando configuración inicial:", e);
    }
}

// --- BUSCADOR DINÁMICO (AL PRESIONAR ENTER O ESCANEAR) ---
window.buscarProductoCompra = async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const criterio = document.getElementById('buscador-dinamico').value.trim();
        if (!criterio) return;

        mostrarEstado("🔍 Buscando artículo...", "loading");

        try {
            // 1. Intentar buscar primero asumiendo que el criterio es el ID directo del documento (SKU)
            let prodDoc = await getDoc(doc(db, "usuarios", USER_ID, "productos", criterio));
            
            if (prodDoc.exists()) {
                cargarDatosFicha(prodDoc.id, prodDoc.data());
                mostrarEstado("✅ Producto encontrado por SKU.", "success");
            } else {
                // 2. Si no lo encuentra por ID, hacer una consulta en el campo "barras"
                const q = query(collection(db, "usuarios", USER_ID, "productos"), where("barras", "==", criterio));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const docEncontrado = querySnapshot.docs[0];
                    cargarDatosFicha(docEncontrado.id, docEncontrado.data());
                    mostrarEstado("✅ Producto encontrado por Código de Barras.", "success");
                } else {
                    // 3. Es un producto totalmente nuevo
                    limpiarFormularioParaNuevo(criterio);
                    mostrarEstado("ℹ️ El código no existe. Preparado para registro nuevo.", "success");
                }
            }
        } catch (error) {
            console.error(error);
            mostrarEstado("❌ Error al consultar la base de datos.", "error");
        }
    }
};

// --- LLENAR CAMPOS DE LA FICHA ---
function cargarDatosFicha(id, data) {
    document.getElementById('comp-sku').value = id || data.sku || '';
    document.getElementById('comp-sku').disabled = true; // Si existe, protegemos el ID
    document.getElementById('comp-barras').value = data.barras || '';
    document.getElementById('comp-nombre').value = data.nombre || '';
    document.getElementById('comp-costo').value = (data.costo || 0).toFixed(2);
    document.getElementById('comp-ganancia').value = (data.ganancia || 0).toFixed(1);
    document.getElementById('comp-precio').value = (data.precio || 0).toFixed(2);
    document.getElementById('comp-stock-viejo').value = data.stock || 0;
    document.getElementById('comp-cantidad').value = 0;
    
    window.calcularPreciosCompra();
    document.getElementById('comp-cantidad').focus();
}

function limpiarFormularioParaNuevo(codigo) {
    document.getElementById('comp-sku').value = codigo;
    document.getElementById('comp-sku').disabled = false;
    document.getElementById('comp-barras').value = codigo.length > 8 ? codigo : '';
    document.getElementById('comp-nombre').value = '';
    document.getElementById('comp-costo').value = '0.00';
    document.getElementById('comp-ganancia').value = '0.0';
    document.getElementById('comp-precio').value = '0.00';
    document.getElementById('comp-stock-viejo').value = 0;
    document.getElementById('comp-cantidad').value = 0;
    document.getElementById('comp-precio-bs').value = '0,00 Bs.';
    document.getElementById('comp-nombre').focus();
}

// --- MATEMÁTICA Y CÁLCULOS INTERNOS ---
window.calcularPreciosCompra = () => {
    const costo = parseFloat(document.getElementById('comp-costo').value) || 0;
    const ganancia = parseFloat(document.getElementById('comp-ganancia').value) || 0;
    
    const precioUSD = costo + (costo * (ganancia / 100));
    const precioBS = precioUSD * tasaActual;

    document.getElementById('comp-precio').value = precioUSD.toFixed(2);
    document.getElementById('comp-precio-bs').value = precioBS.toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularGananciaCompra = () => {
    const costo = parseFloat(document.getElementById('comp-costo').value) || 0;
    const precioUSD = parseFloat(document.getElementById('comp-precio').value) || 0;

    if (costo > 0) {
        document.getElementById('form-ganancia').value = (((precioUSD - costo) / costo) * 100).toFixed(1);
    }
    document.getElementById('comp-precio-bs').value = (precioUSD * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

// --- PROCESAR PROCESO DE GUARDADO MASIVO / INDIVIDUAL ---
window.procesarIngresoMercancia = async () => {
    const btn = document.getElementById('btnGuardarCompra');
    const sku = document.getElementById('comp-sku').value.trim();
    const nombre = document.getElementById('comp-nombre').value.trim();
    const stockViejo = parseInt(document.getElementById('comp-stock-viejo').value) || 0;
    const cantidadEntrante = parseInt(document.getElementById('comp-cantidad').value) || 0;
    const fecha = document.getElementById('comp-fecha').value;

    if (!sku || !nombre) {
        alert("Los campos SKU y Descripción son obligatorios.");
        return;
    }

    btn.disabled = true;
    mostrarEstado("⏳ Guardando y actualizando inventario...", "loading");

    // Calcular el inventario acumulado final
    const stockFinal = stockViejo + cantidadEntrante;

    const datosProducto = {
        sku: sku,
        barras: document.getElementById('comp-barras').value.trim(),
        nombre: nombre,
        costo: parseFloat(document.getElementById('comp-costo').value) || 0,
        ganancia: parseFloat(document.getElementById('comp-ganancia').value) || 0,
        precio: parseFloat(document.getElementById('comp-precio').value) || 0,
        stock: stockFinal,
        fecha_ingreso: fecha // Tu nuevo campo fecha guardado con éxito
    };

    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), datosProducto, { merge: true });
        
        mostrarEstado(`✅ Éxito: Ingresaron ${cantidadEntrante} unidades a ${sku}. Stock total: ${stockFinal}`, "success");
        
        // Limpiar buscador principal para la siguiente entrada
        document.getElementById('buscador-dinamico').value = '';
        document.getElementById('buscador-dinamico').focus();
    } catch (error) {
        console.error(error);
        mostrarEstado("❌ Ocurrió un error al guardar en Firestore.", "error");
    } finally {
        btn.disabled = false;
    }
};

// --- ESCUCHADOR ATAJO DE TECLADO F9 ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        e.preventDefault();
        window.procesarIngresoMercancia();
    }
});

inicializarModulo();
