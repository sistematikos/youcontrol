/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Operaciones de Inventario unificado con Ficha de Producto
 */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Obtenemos el ID de la empresa exactamente igual que en la Ficha de Producto
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];
let indiceRes = -1;
let productoSeleccionado = null;

// Inicialización
async function iniciarOperacionesInventario() {
    if (!USER_ID) {
        console.warn("No se encontró el ID de empresa en localStorage (youcontrol_empresa_id).");
        return;
    }

    try {
        // Misma consulta de colección jerárquica usada en Ficha de Producto
        const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
        listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("Productos cargados para inventario:", listaProductosGlobal.length);
    } catch (e) {
        console.error("Error al cargar productos de Firestore:", e);
    }
}

// 1. Lógica de filtrado en tiempo real (al escribir)
const buscador = document.getElementById('buscador-prod-inv');
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const lista = document.getElementById('lista-resultados-inv');
        indiceRes = -1;

        if (term.length < 1) { 
            lista.style.display = 'none'; 
            return; 
        }

        const filtrados = listaProductosGlobal.filter(p => 
            (p.nombre?.toLowerCase().includes(term) || 
             p.sku?.toLowerCase().includes(term) || 
             p.barras?.toLowerCase().includes(term))
        );

        if (filtrados.length > 0) {
            lista.style.display = 'block';
            lista.innerHTML = filtrados.map((p, i) => `
                <div class="item-res-inv" id="res-inv-${i}" onclick="window.cargarProductoInv('${p.id}')" style="padding:10px; cursor:pointer; border-bottom:1px solid #f1f5f9;">
                    <strong>${p.nombre || 'Sin nombre'}</strong><br>
                    <small style="color:#64748B;">SKU: ${p.sku || p.id} | Stock Actual: ${p.stock ?? 0}</small>
                </div>
            `).join('');
        } else {
            lista.style.display = 'block';
            lista.innerHTML = `<div style="padding:10px; color:#94A3B8;"><small>No hay coincidencias</small></div>`;
        }
    });

    // 2. Navegación por teclado (Flechas y Enter)
    buscador.addEventListener('keydown', (e) => {
        const lista = document.getElementById('lista-resultados-inv');
        const items = lista.querySelectorAll('.item-res-inv');

        if (e.key === 'ArrowDown' && indiceRes < items.length - 1) { 
            indiceRes++; 
            items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white'); 
        } 
        else if (e.key === 'ArrowUp' && indiceRes > 0) { 
            indiceRes--; 
            items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white'); 
        } 
        else if (e.key === 'Enter') {
            e.preventDefault();
            const term = buscador.value.trim();

            if (indiceRes >= 0 && items[indiceRes]) {
                items[indiceRes].click();
            } else {
                const encontrado = listaProductosGlobal.find(p => p.sku === term || p.barras === term);
                if (encontrado) {
                    window.cargarProductoInv(encontrado.id);
                } else {
                    alert("⚠️ CÓDIGO O PRODUCTO NO REGISTRADO");
                }
            }
        }
    });
}

// Cargar producto elegido al formulario de inventario
window.cargarProductoInv = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    if (!p) return;

    productoSeleccionado = p;

    document.getElementById('inv-sku').value = p.sku || p.id || "";
    document.getElementById('inv-nombre').value = p.nombre || "";
    document.getElementById('inv-stock-actual').value = p.stock !== undefined ? p.stock : 0;
    document.getElementById('buscador-prod-inv').value = p.nombre || "";

    const lista = document.getElementById('lista-resultados-inv');
    if (lista) lista.style.display = 'none';

    const campoCant = document.getElementById('inv-cantidad');
    if (campoCant) campoCant.focus();
};

// Procesar Entrada / Salida / Ajuste
window.procesarOperacionInventario = async function() {
    if (!productoSeleccionado) {
        alert("Por favor selecciona un producto registrado.");
        return;
    }

    const cantidadInput = document.getElementById('inv-cantidad').value;
    const cantidad = parseFloat(cantidadInput);
    const tipoOp = document.getElementById('inv-tipo-op').value;

    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Ingresa una cantidad válida.");
        return;
    }

    let stockActual = parseInt(productoSeleccionado.stock || 0);
    let nuevoStock = stockActual;

    if (tipoOp === 'ENTRADA') nuevoStock += cantidad;
    else if (tipoOp === 'SALIDA') nuevoStock -= cantidad;
    else if (tipoOp === 'AJUSTE') nuevoStock = cantidad;

    try {
        // Actualiza exactamente la misma ruta de Firestore usada en la Ficha de Producto
        await setDoc(doc(db, "usuarios", USER_ID, "productos", productoSeleccionado.id), {
            stock: parseInt(nuevoStock)
        }, { merge: true });

        alert("¡Inventario actualizado con éxito!");
        
        // Actualizar el valor en memoria local para no requerir recargar la página
        productoSeleccionado.stock = nuevoStock;
        
        // Limpieza de campos
        document.getElementById('inv-sku').value = "";
        document.getElementById('inv-nombre').value = "";
        document.getElementById('inv-stock-actual').value = "0";
        document.getElementById('inv-cantidad').value = "";
        document.getElementById('buscador-prod-inv').value = "";
        productoSeleccionado = null;

        iniciarOperacionesInventario();
    } catch (e) {
        alert("Error al actualizar inventario: " + e.message);
    }
};

// Atajo global F9
document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        e.preventDefault();
        window.procesarOperacionInventario();
    }
});

document.addEventListener('DOMContentLoaded', iniciarOperacionesInventario);
