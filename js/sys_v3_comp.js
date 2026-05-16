import { db } from './firebase-config.js';
import { 
    doc, getDoc, setDoc, collection, getDocs, query, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1.00;

// --- MOSTRAR NOTIFICACIONES EN LA BARRA DE ESTADO ---
function mostrarEstado(mensaje, tipo) {
    const bar = document.getElementById('status-bar-comp');
    if (!bar) return;
    bar.className = `status-${tipo}`;
    bar.innerText = mensaje;
    bar.style.display = 'block';
    if (tipo === 'success') {
        setTimeout(() => { bar.style.display = 'none'; }, 4000);
    }
}

// --- CONTEXTO DE INICIALIZACIÓN ---
async function inicializarModulo() {
    // Definir la fecha actual por defecto en el input
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('comp-fecha').value = hoy;

    try {
        // Consultar la tasa de cambio vigente
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            document.getElementById('txt-tasa').innerText = tasaActual.toFixed(2).replace('.', ',');
        }
    } catch (e) {
        console.error("Error al inicializar el módulo de compras:", e);
    }
}

// --- BUSCADOR INTELIGENTE POR ENTRADA O ESCANEO ---
window.buscarProductoCompra = async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Bloquear saltos de línea del lector
        const criterio = document.getElementById('buscador-dinamico').value.trim();
        if (!criterio) return;

        mostrarEstado("🔍 Localizando artículo en Firebase...", "loading");

        try {
            // Camino 1: Buscar usando el criterio como el ID directo del documento (SKU)
            let prodDoc = await getDoc(doc(db, "usuarios", USER_ID, "productos", criterio));
            
            if (prodDoc.exists()) {
                cargarDatosFicha(prodDoc.id, prodDoc.data());
                mostrarEstado("✅ Producto localizado mediante su SKU.", "success");
            } else {
                // Camino 2: Buscar dentro de la colección filtrando por el campo "barras"
                const q = query(collection(db, "usuarios", USER_ID, "productos"), where("barras", "==", criterio));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const docEncontrado = querySnapshot.docs[0];
                    cargarDatosFicha(docEncontrado.id, docEncontrado.data());
                    mostrarEstado("✅ Producto localizado mediante su Código de Barras.", "success");
                } else {
                    // Camino 3: Es un artículo que no existe en el inventario actual
                    limpiarFormularioParaNuevo(criterio);
                    mostrarEstado("ℹ️ El código digitado no existe. Preparado para registro nuevo.", "success");
                }
            }
        } catch (error) {
            console.error(error);
            mostrarEstado("❌ Error de comunicación con la base de datos.", "error");
        }
    }
};

// --- ACOPLAMIENTO DE DATOS EN LOS CAMPOS ---
function cargarDatosFicha(id, data) {
    document.getElementById('comp-sku').value = id || data.sku || '';
    document.getElementById('comp-sku').disabled = true; // Proteger clave ID primaria de productos viejos
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
    // Si el código parece un código de barras de producto real (largo), clonarlo al campo barras
    document.getElementById('comp-barras').value = codigo.length > 7 ? codigo : '';
    document.getElementById('comp-nombre').value = '';
    document.getElementById('comp-costo').value = '0.00';
    document.getElementById('comp-ganancia').value = '0.0';
    document.getElementById('comp-precio').value = '0.00';
    document.getElementById('comp-stock-viejo').value = 0;
    document.getElementById('comp-cantidad').value = 0;
    document.getElementById('comp-precio-bs').value = '0,00 Bs.';
    document.getElementById('comp-nombre').focus();
}

// --- FÓRMULAS MATEMÁTICAS EN CALIENTE ---
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
        document.getElementById('comp-ganancia').value = (((precioUSD - costo) / costo) * 100).toFixed(1);
    }
    document.getElementById('comp-precio-bs').value = (precioUSD * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

// --- PROCESAMIENTO E INYECCIÓN DE LA ENTRADA ---
window.procesarIngresoMercancia = async () => {
    const btn = document.getElementById('btnGuardarCompra');
    if (btn.disabled) return;

    const sku = document.getElementById('comp-sku').value.trim();
    const nombre = document.getElementById('comp-nombre').value.trim();
    const stockViejo = parseInt(document.getElementById('comp-stock-viejo').value) || 0;
    const cantidadEntrante = parseInt(document.getElementById('comp-cantidad').value) || 0;
    const fecha = document.getElementById('comp-fecha').value;

    if (!sku || !nombre) {
        alert("Los campos SKU y Descripción son obligatorios para guardar el registro.");
        return;
    }

    btn.disabled = true;
    mostrarEstado("⏳ Procesando ingreso y recalculando inventarios...", "loading");

    // Realizar la suma acumulativa matemática del stock
    const stockFinal = stockViejo + cantidadEntrante;

    const datosProducto = {
        sku: sku,
        barras: document.getElementById('comp-barras').value.trim(),
        nombre: nombre,
        costo: parseFloat(document.getElementById('comp-costo').value) || 0,
        ganancia: parseFloat(document.getElementById('comp-ganancia').value) || 0,
        precio: parseFloat(document.getElementById('comp-precio').value) || 0,
        stock: stockFinal,
        fecha_ingreso: fecha // Nuevo campo fecha de trazabilidad inyectado con éxito
    };

    try {
        // Se guarda en Firebase usando siempre el SKU como el identificador único del documento
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), datosProducto, { merge: true });
        
        mostrarEstado(`✅ Éxito: Se ingresaron ${cantidadEntrante} unidades a [${sku}]. Nuevo Total: ${stockFinal}`, "success");
        
        // Limpieza y enfoque automático del buscador para dejar el sistema listo para el siguiente artículo
        document.getElementById('buscador-dinamico').value = '';
        document.getElementById('buscador-dinamico').focus();
    } catch (error) {
        console.error(error);
        mostrarEstado("❌ Error crítico: No se pudieron consolidar los datos en el servidor.", "error");
    } finally {
        btn.disabled = false;
    }
};

// --- ESCUCHADOR GLOBAL DE ATAJOS (F9) ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        e.preventDefault(); // Previene comportamientos de ayuda del navegador
        window.procesarIngresoMercancia();
    }
});

// Arrancar proceso
inicializarModulo();
