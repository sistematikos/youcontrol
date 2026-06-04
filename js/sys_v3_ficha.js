/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Ficha de Producto
 */
import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];

// Establecer Stock como SOLO LECTURA al cargar
document.addEventListener('DOMContentLoaded', () => {
    const stockInput = document.getElementById('prod-stock');
    if (stockInput) stockInput.readOnly = true;
    iniciarFicha();
});

function evaluarCalculo(str) {
    if (!str) return 0;
    // Reemplazamos coma por punto para decimales
    let s = str.toString().replace(/,/g, '.');
    
    // Si contiene '+' y '%', hacemos el cálculo de porcentaje
    if (s.includes('+') && s.includes('%')) {
        const partes = s.split('+');
        const base = parseFloat(partes[0]);
        const porcentaje = parseFloat(partes[1].replace('%', ''));
        if (isNaN(base) || isNaN(porcentaje)) return parseFloat(base) || 0;
        return base + (base * (porcentaje / 100));
    }
    
    // Si es una operación simple (ej: 8.31*1.30)
    try {
        // Solo evaluamos si tiene caracteres matemáticos permitidos
        if (/^[0-9.+\-*/() ]+$/.test(s)) {
            return eval(s);
        }
        return parseFloat(s) || 0;
    } catch (e) { 
        return parseFloat(s) || 0; 
    }
}

async function iniciarFicha() {
    if (!USER_ID) return;

    // 1. Cargar Departamentos
    const deptoSelect = document.getElementById('prod-depto');
    const snapDeptos = await getDocs(query(collection(db, "usuarios", USER_ID, "departamentos")));
    
    deptoSelect.innerHTML = '<option value="GENERAL">GENERAL</option>';
    snapDeptos.forEach(d => {
        deptoSelect.innerHTML += `<option value="${d.id}">${d.data().nombre.toUpperCase()}</option>`;
    });

    // 2. Cargar Productos
    const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
    listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
}

window.limpiarFormulario = () => {
    document.getElementById('buscador-prod').value = "";
    document.getElementById('prod-sku').value = "";
    document.getElementById('prod-nombre').value = "";
    document.getElementById('prod-barras').value = "";
    document.getElementById('prod-costo').value = "";
    document.getElementById('prod-ganancia').value = "";
    document.getElementById('prod-precio').value = "";
    document.getElementById('prod-stock').value = "";
    document.getElementById('prod-depto').value = "GENERAL";
    document.getElementById('lista-resultados').style.display = 'none';
};

window.calcularPrecio = function() {
    let costoInput = document.getElementById('prod-costo');
    let gananciaInput = document.getElementById('prod-ganancia');
    
    let costo = evaluarCalculo(costoInput.value);
    let ganancia = evaluarCalculo(gananciaInput.value);
    
    let precio = costo + (costo * (ganancia / 100));
    
    document.getElementById('prod-precio').value = precio.toFixed(2);
    actualizarPrecioBs(precio);
};

// 1. Añade este evento para procesar el cálculo al presionar Enter en el costo
document.getElementById('prod-costo').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Evita que se dispare otro proceso
        const input = e.target;
        // Calcula el resultado y lo pone en el mismo input
        const resultado = evaluarCalculo(input.value);
        input.value = resultado.toFixed(2);
        
        // Ejecuta el cálculo de precios inmediatamente después
        window.calcularPrecio();
        
        // Pasa el foco al siguiente campo (Ganancia)
        document.getElementById('prod-ganancia').focus();
    }
});

function actualizarPrecioBs(precioUsd) {
    const tasa = parseFloat(localStorage.getItem('tasa_bcv') || 1);
    document.getElementById('prod-precio-bs').value = (precioUsd * tasa).toLocaleString('es-VE', {minimumFractionDigits: 2});
}

window.guardarProducto = async function() {
    const sku = document.getElementById('prod-sku').value.trim();
    if (!sku) return alert("El SKU es obligatorio.");
    
    try {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", sku), {
            sku: sku,
            nombre: document.getElementById('prod-nombre').value,
            barras: document.getElementById('prod-barras').value,
            costo: parseFloat(document.getElementById('prod-costo').value || 0),
            ganancia: parseFloat(document.getElementById('prod-ganancia').value || 0),
            precio: parseFloat(document.getElementById('prod-precio').value || 0),
            stock: parseInt(document.getElementById('prod-stock').value || 0),
            departamento: document.getElementById('prod-depto').value
        });
        
        alert("¡Producto guardado correctamente!");
        await iniciarFicha();
        window.limpiarFormulario();
    } catch (e) { alert("Error al guardar: " + e.message); }
};

document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const lista = document.getElementById('lista-resultados');
    if (term.length < 2) { lista.style.display = 'none'; return; }

    const filtrados = Array.from(new Set(listaProductosGlobal.map(p => p.id)))
        .map(id => listaProductosGlobal.find(p => p.id === id))
        .filter(p => p.nombre?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term));

    lista.style.display = 'block';
    lista.innerHTML = filtrados.map(p => `
        <div class="item-res" onclick="window.cargarProducto('${p.id}')">
            ${p.nombre || "Sin nombre"} (SKU: ${p.sku || "Sin SKU"})
        </div>
    `).join('');
});

window.cargarProducto = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    if (!p) return;

    document.getElementById('prod-sku').value = p.sku || "";
    document.getElementById('prod-nombre').value = p.nombre || "";
    document.getElementById('prod-barras').value = p.barras || "";
    document.getElementById('prod-costo').value = p.costo || 0;
    document.getElementById('prod-ganancia').value = p.ganancia || 0;
    document.getElementById('prod-precio').value = p.precio || 0;
    document.getElementById('prod-stock').value = p.stock || 0;
    document.getElementById('prod-depto').value = p.departamento || "GENERAL";
    document.getElementById('lista-resultados').style.display = 'none';
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        e.preventDefault();
        window.guardarProducto();
    }
});

let indiceRes = -1;
document.getElementById('buscador-prod').addEventListener('keydown', (e) => {
    const lista = document.getElementById('lista-resultados');
    const items = lista.querySelectorAll('.item-res');
    if (e.key === 'ArrowDown' && indiceRes < items.length - 1) {
        indiceRes++;
        actualizarSeleccion(items);
    } else if (e.key === 'ArrowUp' && indiceRes > 0) {
        indiceRes--;
        actualizarSeleccion(items);
    } else if (e.key === 'Enter' && indiceRes >= 0 && items[indiceRes]) {
        e.preventDefault();
        items[indiceRes].click();
    }
});

function actualizarSeleccion(items) {
    items.forEach((item, idx) => {
        item.style.background = (idx === indiceRes) ? '#F1F5F9' : 'white';
    });
}

document.getElementById('buscador-prod').addEventListener('input', () => indiceRes = -1);
