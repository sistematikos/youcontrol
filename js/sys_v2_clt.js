import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = [];
let indiceRes = -1;

document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const tablaClientes = document.getElementById('tabla-clientes');
    const inputCodigo = document.getElementById('cl-codigo'); // Buscador principal (Ficha)
    const inputBuscar = document.getElementById('buscar-cliente'); // Buscador de tabla

    // 1. Escuchar clientes en tiempo real
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarTabla(clientesMaster);
    });

    // 2. LÓGICA DE BUSCADOR TIPO "PRODUCTOS" (En el input de código)
    inputCodigo.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        // Aquí podrías mostrar un pequeño contenedor de resultados si quisieras, 
        // pero lo más importante es que al dar Enter encuentre al cliente:
        if (term.length > 0) {
            const cliente = clientesMaster.find(c => c.codigo?.toLowerCase() === term);
            if (cliente) {
                document.getElementById('aviso-no-registrado').style.display = 'none';
            }
        }
    });

    inputCodigo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = inputCodigo.value.trim().toUpperCase();
            const cliente = clientesMaster.find(c => c.codigo?.toUpperCase() === term);
            if (cliente) {
                window.cargarDatosCliente(cliente);
            } else {
                document.getElementById('aviso-no-registrado').style.display = 'block';
                document.getElementById('cl-nombre').focus();
            }
        }
    });

    // 3. Buscador en Tabla (Filtrado visual inmediato)
    inputBuscar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtrados = clientesMaster.filter(c => 
            c.codigo?.toLowerCase().includes(term) || 
            c.nombre?.toLowerCase().includes(term)
        );
        renderizarTabla(filtrados);
    });

    // 4. Guardar Cliente
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = inputCodigo.value.trim().toUpperCase();
        try {
            await setDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", codigo), {
                codigo: codigo,
                nombre: document.getElementById('cl-nombre').value.trim().toUpperCase(),
                rif: document.getElementById('cl-rif').value.trim().toUpperCase(),
                telefono: document.getElementById('cl-telefono').value.trim(),
                direccion: document.getElementById('cl-direccion').value.trim().toUpperCase(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("✅ Operación exitosa");
            formCliente.reset();
            inputCodigo.readOnly = false;
        } catch (e) {
            alert("Error al guardar: " + e.message);
        }
    });

    function renderizarTabla(lista) {
        if (!tablaClientes) return;
        tablaClientes.innerHTML = lista.map(c => `
            <tr>
                <td>${c.codigo}</td>
                <td><b>${c.nombre}</b></td>
                <td>${c.rif || '-'}</td>
                <td>
                    <button class="btn-table" onclick="window.prepararEdicion('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-table" onclick="window.eliminarCliente('${c.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
});

// Funciones globales
window.cargarDatosCliente = (c) => {
    document.getElementById('cliente-id').value = c.id;
    document.getElementById('cl-codigo').value = c.codigo;
    document.getElementById('cl-codigo').readOnly = true;
    document.getElementById('cl-nombre').value = c.nombre;
    document.getElementById('cl-rif').value = c.rif || '';
    document.getElementById('cl-telefono').value = c.telefono || '';
    document.getElementById('cl-direccion').value = c.direccion || '';
    document.getElementById('btn-guardar-cliente').innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR`;
    document.getElementById('btn-cancelar-edicion').style.display = 'block';
};

window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) window.cargarDatosCliente(c);
};

window.eliminarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente?")) {
        await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
    }
};
