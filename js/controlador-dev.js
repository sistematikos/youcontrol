import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let facturaEncontrada = null;

window.buscarFacturaParaDevolver = async () => {
    const nroFactura = document.getElementById('busqueda-factura').value;
    if (!nroFactura) return alert("Por favor ingresa un número de factura.");

    try {
        const q = query(
            collection(db, "usuarios", USER_ID, "ventas"), 
            where("nro_factura", "==", nroFactura)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Factura no encontrada.");
            return;
        }

        // Obtener datos
        querySnapshot.forEach((doc) => {
            facturaEncontrada = { id: doc.id, ...doc.data() };
        });

        // Mostrar datos en pantalla
        document.getElementById('nro-factura-display').innerText = facturaEncontrada.nro_factura;
        renderizarProductos(facturaEncontrada.items);
        document.getElementById('resultado-busqueda').style.display = 'block';

    } catch (e) {
        console.error(e);
        alert("Error al buscar la factura.");
    }
};

function renderizarProductos(items) {
    const contenedor = document.getElementById('lista-productos-dev');
    contenedor.innerHTML = `
        <table style="width:100%; border-collapse: collapse;">
            <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr></thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.nombre}</td>
                        <td>${item.cantidad}</td>
                        <td>$${item.precio}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
