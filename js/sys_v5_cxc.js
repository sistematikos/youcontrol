import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

document.addEventListener('DOMContentLoaded', () => {
    const tablaCxc = document.getElementById('tabla-cxc');
    const inputBusqueda = document.getElementById('input-busqueda');
    
    // KPIs
    const txtTotDeuda = document.getElementById('tot-deuda');
    const txtTotAbonado = document.getElementById('tot-abonado');
    const txtTotPendientes = document.getElementById('tot-pendientes');
    const txtTotClientes = document.getElementById('tot-clientes');

    let arrayCxcGlobal = [];

    function inicializarCXC() {
        if (!USER_ID) {
            console.error("No se encontró el ID de usuario.");
            tablaCxc.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:20px; color:red;">Error: Sesión de empresa no encontrada.</td></tr>`;
            return;
        }
        
        const colRef = collection(db, "usuarios", USER_ID, "cuentas_por_cobrar");

        onSnapshot(colRef, (snapshot) => {
            arrayCxcGlobal = [];
            
            snapshot.forEach((docSnap) => {
                const c = docSnap.data();
                const total = parseFloat(c.monto_total || c.total || 0);
                const abonado = parseFloat(c.monto_abonado || c.abonado || 0);
                const pendiente = total - abonado;

                arrayCxcGlobal.push({
                    id: docSnap.id,
                    fecha: c.fecha || "S/F",
                    cliente: c.cliente || c.nombre_cliente || "Cliente General",
                    concepto: c.concepto || c.detalle || "Venta a crédito",
                    monto_total: total,
                    monto_abonado: abonado,
                    saldo_pendiente: pendiente,
                    estado: c.estado || (pendiente <= 0 ? "Pagado" : abonado > 0 ? "Parcial" : "Pendiente")
                });
            });

            procesarYFiltrarCXC();
        }, (error) => {
            console.error("Error al escuchar cuentas por cobrar:", error);
            tablaCxc.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:20px; color:red;">Error al sincronizar con Firebase.</td></tr>`;
        });
    }

    function procesarYFiltrarCXC() {
        const filtro = inputBusqueda.value.toLowerCase().trim();
        tablaCxc.innerHTML = "";

        const cxcFiltradas = arrayCxcGlobal.filter(item => 
            item.cliente.toLowerCase().includes(filtro) || item.concepto.toLowerCase().includes(filtro)
        );

        let sumaDeuda = 0;
        let sumaAbonado = 0;
        let countPendientes = 0;
        const clientesUnicos = new Set();

        if (cxcFiltradas.length === 0) {
            tablaCxc.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:20px;">No se encontraron registros de cuentas por cobrar.</td></tr>`;
        } else {
            cxcFiltradas.forEach(item => {
                if (item.saldo_pendiente > 0) {
                    sumaDeuda += item.saldo_pendiente;
                    sumaAbonado += item.monto_abonado;
                    countPendientes++;
                    clientesUnicos.add(item.cliente);
                }

                let badgeClass = "status-pendiente";
                if (item.estado === "Pagado" || item.saldo_pendiente <= 0) badgeClass = "status-pagado";
                else if (item.estado === "Parcial" || item.monto_abonado > 0) badgeClass = "status-parcial";

                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td style="font-size:0.75rem; color: var(--text-muted);">${item.fecha}</td>
                    <td style="font-weight:600;">${item.cliente}</td>
                    <td>${item.concepto}</td>
                    <td class="text-right" style="font-weight:600;">$ ${item.monto_total.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--emerald); font-weight:600;">$ ${item.monto_abonado.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--rose); font-weight:700;">$ ${item.saldo_pendiente.toFixed(2)}</td>
                    <td class="text-center"><span class="badge-status ${badgeClass}">${item.saldo_pendiente <= 0 ? 'Pagado' : item.estado}</span></td>
                    <td class="text-center">
                        <button class="btn-accion" onclick="window.registrarAbono('${item.id}')"><i class="fas fa-cash-register"></i> Abonar</button>
                    </td>
                `;
                tablaCxc.appendChild(fila);
            });
        }

        // Actualizar KPIs superiores
        txtTotDeuda.innerText = `$ ${sumaDeuda.toFixed(2)}`;
        txtTotAbonado.innerText = `$ ${sumaAbonado.toFixed(2)}`;
        txtTotPendientes.innerText = countPendientes;
        txtTotClientes.innerText = clientesUnicos.size;
    }

    // Función global para manejar abonos o pagos (preparada para integrarla con un modal o prompt rápido)
    window.registrarAbono = function(idRegistro) {
        alert(`Aquí procesarás el abono para el documento ID: ${idRegistro} y actualizarás Firebase.`);
    };

    inputBusqueda.addEventListener('input', procesarYFiltrarCXC);
    inicializarCXC();
});
