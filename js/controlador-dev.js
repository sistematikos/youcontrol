import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { registrarDevolucion } from './pos-core-dev.js';

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let facturaEncontrada = null;

window.buscarFacturaParaDevolver = async () => {
    const nro = document.getElementById('busqueda-factura').value;
    const q = query(collection(db, "usuarios", USER_ID, "ventas"), where("nro_factura", "==", nro));
    const snap = await getDocs(q);

    if (snap.empty) return alert("Factura no encontrada.");

    snap.forEach(d => facturaEncontrada = { id: d.id, ...d.data() });

    document.getElementById('nro-factura-display').innerText = facturaEncontrada.nro_factura;
    document.getElementById('resultado-busqueda').style.display = 'block';
    
    let html = `<table><thead><tr><th>Producto</th><th>Cant.</th></tr></thead><tbody>`;
    facturaEncontrada.items.forEach(item => {
        html += `<tr><td>${item.nombre}</td><td>${item.cantidad}</td></tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('lista-productos-dev').innerHTML = html;
};

window.ejecutarProcesoDev = async () => {
    const motivo = document.getElementById('motivo-devolucion').value;
    if (!motivo) return alert("Escribe un motivo.");
    
    try {
        await registrarDevolucion(facturaEncontrada.id, facturaEncontrada.items, motivo);
        alert("¡Devolución exitosa y stock actualizado!");
        window.location.reload();
    } catch (e) {
        alert("Error: " + e.message);
    }
};
