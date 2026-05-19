/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Gestión de Clientes en Firestore v2.0 (sys_v2_clt.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let clientesMaster = [];
let editMode = false;

const formCliente = document.getElementById('form-cliente');
const tablaClientes = document.getElementById('tabla-clientes');
const inputBuscar = document.getElementById('buscar-cliente');
const btnCancelar = document.getElementById('btn-cancelar-edicion');
const formTitle = document.getElementById('form-title');
const btnGuardar = document.getElementById('btn-guardar-cliente');

// ==========================================
// 1. ESCUCHAR CLIENTES EN TIEMPO REAL
// ==========================================
function inicializarClientes() {
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach((docSnap) => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Ordenar alfabéticamente por defecto
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        renderizarTabla(clientesMaster);
    });
}

// ==========================================
// 2. RENDERIZAR TABLA DE CLIENTES
// ==========================================
function renderizarTabla(lista) {
    if (!tablaClientes) return;
    
    if (lista.length === 0) {
        tablaClientes.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94A3B8; font-weight:600; padding:30px;">Ningún cliente registrado o encontrado.</td></tr>`;
        return;
    }

    tablaClientes.innerHTML = lista.map(c => {
        return `
            <tr>
                <td><b style="color:#0F172A;">${c.nombre}</b></td>
                <td><span class="badge-rif">${c.rif || 'S/R'}</span></td>
                <td style="font-weight:600; color:#334155;">${c.telefono || 'S/T'}</td>
                <td style="font-size:0.85rem; color:#64748B;">${c.direccion || 'S/D'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn-table btn-edit" onclick="window.prepararEdicion('${c.id}')" title="Editar Ficha">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table btn-delete" onclick="window.eliminarCliente('${c.id}', '${c.nombre}')" title="Eliminar de Cartera">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// 3. REGISTRAR O ACTUALIZAR CLIENTE (CRUD)
// ==========================================
if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('cliente-id').value;
        const nombre = document.getElementById('cl-nombre').value.trim().toUpperCase();
        const rif = document.getElementById('cl-rif').value.trim().toUpperCase();
        const telefono = document.getElementById('cl-telefono').value.trim();
        const direccion = document.getElementById('cl-direccion').value.trim().toUpperCase();

        btnGuardar.disabled = true;
        btnGuardar.innerText = "PROCESANDO...";

        try {
            if (editMode) {
                // Actualizar Registro Existente
                const clienteRef = doc(db, "usuarios", USER_ID, "clientes", id);
                await updateDoc(clienteRef, {
                    nombre, rif, telefono, direccion,
                    fecha_modificacion: serverTimestamp()
                });
                alert("✅ Ficha de cliente actualizada correctamente");
                cancelarEdicion();
            } else {
                // Insertar Nuevo Registro
                const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
                await addDoc(clientesRef, {
                    nombre, rif, telefono, direccion,
                    fecha_creacion: serverTimestamp()
                });
                alert("✅ Cliente registrado con éxito en el sistema");
                formCliente.reset();
            }
        } catch (error) {
            console.error("Error en operación de cliente:", error);
            alert("Error al interactuar con Firebase");
        }

        btnGuardar.disabled = false;
        btnGuardar.innerHTML = `<i class="fas fa-save"></i> GUARDAR CLIENTE`;
    });
}

// ==========================================
// 4. FUNCIONES GLOBALES PARA LA TABLA (WINDOW)
// ==========================================
window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (!c) return;

    document.getElementById('cliente-id').value = c.id;
    document.getElementById('cl-nombre').value = c.nombre;
    document.getElementById('cl-rif').value = c.rif || '';
    document.getElementById('cl-telefono').value = c.telefono || '';
    document.getElementById('cl-direccion').value = c.direccion || '';

    editMode = true;
    formTitle.innerHTML = `<i class="fas fa-user-edit"></i> Editar Cliente`;
    btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR FICHA`;
    if (btnCancelar) btnCancelar.style.display = 'block';
    
    // Auto-scroll al formulario en dispositivos pequeños
    formCliente.scrollIntoView({ behavior: 'smooth' });
};

window.eliminarCliente = async (id, nombre) => {
    if (confirm(`¿Está seguro de que desea eliminar al cliente "${nombre}"?\nEsta acción no se puede deshacer.`)) {
        try {
            const clienteRef = doc(db, "usuarios", USER_ID, "clientes", id);
            await deleteDoc(clienteRef);
            alert("🗑️ Cliente removido de la cartera con éxito");
            if (editMode && document.getElementById('cliente-id').value === id) {
                cancelarEdicion();
            }
        } catch (error) {
            console.error("Error al eliminar cliente:", error);
            alert("No se pudo eliminar el registro de la nube.");
        }
    }
};

function cancelarEdicion() {
    formCliente.reset();
    document.getElementById('cliente-id').value = '';
    editMode = false;
    formTitle.innerHTML = `<i class="fas fa-user-plus"></i> Registrar Cliente`;
    btnGuardar.innerHTML = `<i class="fas fa-save"></i> GUARDAR CLIENTE`;
    if (btnCancelar) btnCancelar.style.display = 'none';
}

if (btnCancelar) btnCancelar.addEventListener('click', cancelarEdicion);

// ==========================================
// 5. FILTRO DE BÚSQUEDA DINÁMICO
// ==========================================
if (inputBuscar) {
    inputBuscar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        const filtrados = clientesMaster.filter(c => {
            return (c.nombre || '').toLowerCase().includes(query) || 
                   (c.rif || '').toLowerCase().includes(query) || 
                   (c.telefono || '').toLowerCase().includes(query);
        });
        
        renderizarTabla(filtrados);
    });
}

// Arrancar Módulo
inicializarClientes();
