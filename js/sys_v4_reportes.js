/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Consolidado y Reportes Gerenciales (sys_v4_reportes.js)
 * Sincronizado al 100% con Cloud Firestore - v4
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ID de usuario compartido del ecosistema Inventario Pro
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

// Variables de Estado
let tasaActual = 1.00;

// Vinculaciones del DOM del Resumen Gerencial
const txtTotalCosto = document.getElementById('total-costo');
const txtTotalCostoBs = document.getElementById('total-costo-bs');
const txtTotalVenta = document.getElementById('total-venta');
const txtTotalVentaBs = document.getElementById('total-venta-bs');
const txtTotalGanancia = document.getElementById('total-ganancia');
const txtTotalGananciaBs = document.getElementById('total-ganancia-bs');
const txtTotalItems = document.getElementById('total-items');
const txtTotalUnidades = document.getElementById('total-unidades');
const txtTasaDisplay = document.getElementById('tasa-display');
const statusBar = document.getElementById('status-bar-rep');

// ==========================================
// 1. CARGA INICIAL Y ESCUCHA GLOBAL
// ==========================================
async function inicializarReportes() {
    mostrarStatusBar("⏳ Calculando métricas gerenciales v4...", "loading");
    
    try {
        // 1. Extraer tasa actualizada del documento de configuración
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
        }
        if (txtTasaDisplay) {
            txtTasaDisplay.innerText = `Tasa Oficial: ${tasaActual.toFixed(2).replace('.', ',')} Bs.`;
        }

        // 2. Escuchar la colección de productos en vivo para estructurar el Resumen Gerencial
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            let costoInversionTotal = 0;
            let ventaEsperadaTotal = 0;
            let totalItemsDiferentes = 0;
            let totalUnidadesFisicas = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const stock = parseInt(data.stock || 0);
                const costo = parseFloat(data.costo || 0);
                const precio = parseFloat(data.precio || 0);

                if (stock > 0) {
                    costoInversionTotal += (costo * stock);
                    ventaEsperadaTotal += (precio * stock);
                    totalUnidadesFisicas += stock;
                }
                totalItemsDiferentes++;
            });

            const gananciaProyectada = ventaEsperadaTotal - costoInversionTotal;

            // 3. Renderizar los resultados en la interfaz v4
            renderizarMetricasGerenciales(
                costoInversionTotal, 
                ventaEsperadaTotal, 
                gananciaProyectada, 
                totalItemsDiferentes, 
                totalUnidadesFisicas
            );
            
            mostrarStatusBar("✅ Métricas gerenciales v4 sincronizadas.", "success");
        }, (error) => {
            console.error("Error al suscribirse a productos para reportes:", error);
            mostrarStatusBar("❌ Error al leer los datos de inventario.", "loading");
        });

    } catch (e) {
        console.error("Error crítico en módulo reportes v4:", e);
        mostrarStatusBar("❌ Error de comunicación con Firestore.", "loading");
    }
}

// ==========================================
// 2. RENDERIZADO MATEMÁTICO COMERCIAL
// ==========================================
function renderizarMetricasGerenciales(costo, venta, ganancia, items, unidades) {
    // Formatear a USD
    txtTotalCosto.innerText = `$ ${costo.toFixed(2)}`;
    txtTotalVenta.innerText = `$ ${venta.toFixed(2)}`;
    txtTotalGanancia.innerText = `$ ${ganancia.toFixed(2)}`;
    txtTotalItems.innerText = items;
    txtTotalUnidades.innerText = `${unidades} Unidades en stock`;

    // Formatear a BS usando la tasa cargada
    txtTotalCostoBs.innerText = `Bs. ${(costo * tasaActual).toFixed(2).replace('.', ',')}`;
    txtTotalVentaBs.innerText = `Bs. ${(venta * tasaActual).toFixed(2).replace('.', ',')}`;
    txtTotalGananciaBs.innerText = `Bs. ${(ganancia * tasaActual).toFixed(2).replace('.', ',')}`;
}

document.addEventListener('DOMContentLoaded', inicializarReportes);

// ==========================================
// 3. CONTROL VISUAL DE BARRA DE ESTADO
// ==========================================
function mostrarStatusBar(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.innerText = mensaje;
    statusBar.className = ''; 
    statusBar.style.display = 'block';

    if (tipo === 'loading') {
        statusBar.classList.add('status-loading');
    } else if (tipo === 'success') {
        statusBar.classList.add('status-success');
        setTimeout(ocultarStatusBar, 3000);
    }
}

function ocultarStatusBar() {
    if (statusBar) statusBar.style.display = 'none';
}
