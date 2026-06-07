/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Gestión de Clientes (Completo)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = []; // Lista global accesible por todas las funciones

// 1. CARGA INICIAL Y EVENTOS
document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const tablaClientes = document.getElementById('tabla-clientes');
    const inputBuscar = document.getElementById('buscar-cliente'); // Si tienes un buscador extra
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    const formTitle = document.getElementById('form-title');
    const btnGuardar = document.getElementById('btn-guardar-cliente');
    const inputCodigo = document.getElementById('cl-codigo');
    const inputNombre = document.getElementById('cl-nombre');
    const aviso = document.getElementById('aviso-no-registrado');

    // Escuchar clientes en tiempo real
    if (ID_LICENCIA) {
        onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
            clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderizarTabla(clientesMaster);
        });
    }

    // Buscador Inteligente (Enter en Código)
    inputCodigo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigoBuscado = inputCodigo.value.trim().toUpperCase();
            const cliente = clientesMaster.find(c => c.codigo?.toUpperCase() === codigoBuscado);
            if (cliente) {
                aviso.style.display = 'none';
                window.cargarDatosCliente(cliente);
            } else {
                aviso.style.display = 'block';
                inputNombre.focus();
            }
        }
    });

    // Guardar / Actualizar
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = document.getElementById('cl-codigo').value.trim().toUpperCase();
        const nombre = document.getElementById('cl-nombre').value.trim().toUpperCase();
        const rif = document.getElementById('cl-rif').value.trim().toUpperCase();
        const telefono = document.getElementById('cl-telefono').value.trim();
        const direccion = document.getElementById('cl-direccion').value.trim().toUpperCase();

        if (!codigo) { alert("El código es obligatorio."); return; }

        try {
            await setDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", codigo), {
                codigo, nombre, rif, telefono, direccion,
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("✅ Operación exitosa");
            cancelarEdicion();
        } catch (e) { alert("Error al guardar: " + e.message); }
    });

    // Cancelar
    function cancelarEdicion() {
        formCliente.reset();
        inputCodigo.readOnly = false;
        if(aviso) aviso.style.display = 'none';
        if(formTitle) formTitle.innerHTML = `<i class="fas fa-user-plus"></i> Ficha Cliente`;
        if(btnCancelar) btnCancelar.style.display = 'none';
        if(btnGuardar) btnGuardar.innerHTML = `GUARDAR CLIENTE`;
        inputCodigo.focus();
    }
    if(btnCancelar) btnCancelar.addEventListener('click', cancelarEdicion);

    // Renderizado de tabla
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

// 2. FUNCIONES GLOBALES (Exponemos al objeto window para el HTML)
window.cargarDatosCliente = (cl) => {
    document.getElementById('cl-codigo').value = cl.codigo;
    document.getElementById('cliente-id').value = cl.id;
    document.getElementById('cl-nombre').value = cl.nombre;
    document.getElementById('cl-rif').value = cl.rif || '';
    document.getElementById('cl-telefono').value = cl.telefono || '';
    document.getElementById('cl-direccion').value = cl.direccion || '';
    document.getElementById('cl-codigo').readOnly = true;
    
    const btnGuardar = document.getElementById('btn-guardar-cliente');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    if(btnGuardar) btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR`;
    if(btnCancelar) btnCancelar.style.display = 'block';
    document.getElementById('cl-nombre').focus();
};

window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) window.cargarDatosCliente(c);
};

window.eliminarCliente = async (id) => {
    if (confirm(`¿Eliminar este cliente?`)) {
        await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
    }
};
