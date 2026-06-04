/**
 * YOU CONTROL - SISTEMATIKOS
 * Inventario con Gestión de Departamentos
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, getDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const buscadorInv = document.getElementById('buscador-inv');

let tasaActual = 1.00;

// Buscador
buscadorInv.addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase();
    const filas = cuerpoTabla.getElementsByTagName('tr');
    for (let fila of filas) {
        const texto = fila.innerText.toLowerCase();
        fila.style.display = texto.includes(termino) ? '' : 'none';
    }
});

async function inicializarInventario() {
    try {
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (userDoc.exists()) tasaActual = parseFloat(userDoc.data().tasa_bcv) || 1.00;
    } catch (e) { console.error("Error al obtener tasa:", e); }

    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        renderizarTabla(snapshot);
    });
}

function renderizarTabla(snapshot) {
    if (!cuerpoTabla) return;
    cuerpoTabla.innerHTML = "";
    snapshot.forEach(doc => {
        const p = doc.data();
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', doc.id);
        // Usamos p.departamento directamente; si no existe, muestra GENERAL
        tr.innerHTML = `
            <td>${p.barras || 'N/A'}</td>
            <td>${p.sku || 'N/A'}</td>
            <td>${p.nombre || 'Sin nombre'}</td>
            <td>${p.departamento || 'GENERAL'}</td>
            <td>$ ${parseFloat(p.costo || 0).toFixed(2)}</td>
            <td>${p.ganancia || 0}%</td>
            <td>$ ${parseFloat(p.precio || 0).toFixed(2)}</td>
            <td>$ ${(parseFloat(p.precio || 0) * tasaActual).toFixed(2)} Bs</td>
            <td>${p.stock || 0}</td>
            <td>
                <button onclick="window.editarProducto('${doc.id}')">✏️</button>
                <button onclick="window.eliminarProducto('${doc.id}', '${p.nombre}')">🗑️</button>
            </td>
        `;
        cuerpoTabla.appendChild(tr);
    });
}

// --- EDICIÓN DINÁMICA CON DEPARTAMENTOS ---
window.editarProducto = async (id) => {
    const fila = document.querySelector(`tr[data-id="${id}"]`);
    const c = fila.cells;
    const deptoActual = c[3].innerText; // El valor que se muestra en la celda

    const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
    let opciones = '<option value="GENERAL">GENERAL</option>';
    
    deptoSnap.forEach(d => {
        const nombreDepto = d.data().nombre;
        opciones += `<option value="${nombreDepto}" ${nombreDepto === deptoActual ? 'selected' : ''}>${nombreDepto}</option>`;
    });

    fila.innerHTML = `
        <td><input type="text" id="e-barras" value="${c[0].innerText}"></td>
        <td><input type="text" id="e-sku" value="${c[1].innerText}"></td>
        <td><input type="text" id="e-nombre" value="${c[2].innerText}"></td>
        <td><select id="e-depto">${opciones}</select></td>
        <td><input type="number" id="e-costo" value="${c[4].innerText.replace('$ ','')}" oninput="window.calc('costo')"></td>
        <td><input type="number" id="e-ganancia" value="${c[5].innerText.replace('%','').trim()}" oninput="window.calc('ganancia')"></td>
        <td><input type="number" id="e-precio" value="${c[6].innerText.replace('$ ','')}" oninput="window.calc('precio')"></td>
        <td><input type="number" id="e-bs" value="${c[7].innerText.replace('$ ','').replace(' Bs','')}" oninput="window.calc('bs')"></td>
        <td><input type="number" id="e-stock" value="${c[8].innerText}"></td>
        <td><button onclick="window.guardarEdicion('${id}')">💾</button></td>
    `;
};

window.calc = (origen) => {
    let costo = parseFloat(document.getElementById('e-costo').value) || 0;
    let ganancia = parseFloat(document.getElementById('e-ganancia').value) || 0;
    let precio = parseFloat(document.getElementById('e-precio').value) || 0;
    let bs = parseFloat(document.getElementById('e-bs').value) || 0;

    if (origen === 'costo' || origen === 'ganancia') {
        precio = costo + (costo * (ganancia / 100));
        document.getElementById('e-precio').value = precio.toFixed(2);
        document.getElementById('e-bs').value = (precio * tasaActual).toFixed(2);
    } else if (origen === 'precio') {
        ganancia = costo > 0 ? ((precio - costo) / costo) * 100 : 0;
        document.getElementById('e-ganancia').value = ganancia.toFixed(1);
        document.getElementById('e-bs').value = (precio * tasaActual).toFixed(2);
    } else if (origen === 'bs') {
        precio = bs / tasaActual;
        ganancia = costo > 0 ? ((precio - costo) / costo) * 100 : 0;
        document.getElementById('e-precio').value = precio.toFixed(2);
        document.getElementById('e-ganancia').value = ganancia.toFixed(1);
    }
};

window.guardarEdicion = async (id) => {
    await updateDoc(doc(db, "usuarios", USER_ID, "productos", id), {
        barras: document.getElementById('e-barras').value,
        sku: document.getElementById('e-sku').value,
        nombre: document.getElementById('e-nombre').value,
        departamento: document.getElementById('e-depto').value,
        costo: parseFloat(document.getElementById('e-costo').value),
        ganancia: parseFloat(document.getElementById('e-ganancia').value),
        precio: parseFloat(document.getElementById('e-precio').value),
        stock: parseInt(document.getElementById('e-stock').value)
    });
};

window.eliminarProducto = async (id, nombre) => {
    if (confirm(`¿Eliminar ${nombre}?`)) await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
};

document.addEventListener('DOMContentLoaded', inicializarInventario);
