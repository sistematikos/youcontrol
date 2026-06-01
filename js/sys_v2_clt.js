import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');

// Esperar a que el DOM cargue completamente antes de buscar los IDs
document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const tablaClientes = document.getElementById('tabla-clientes');
    const inputBuscar = document.getElementById('buscar-cliente');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');
    const formTitle = document.getElementById('form-title');
    const btnGuardar = document.getElementById('btn-guardar-cliente');
    const inputCodigo = document.getElementById('cl-codigo');
    const inputNombre = document.getElementById('cl-nombre');
    const aviso = document.getElementById('aviso-no-registrado');

    let clientesMaster = [];

    // 1. ESCUCHAR CLIENTES
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarTabla(clientesMaster);
    });

    // 2. BUSCADOR INTELIGENTE
    inputCodigo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const codigo = inputCodigo.value.trim().toUpperCase();
            const cliente = clientesMaster.find(c => c.codigo === codigo);
            if (cliente) {
                aviso.style.display = 'none';
                cargarDatosCliente(cliente);
            } else {
                aviso.style.display = 'block';
                inputNombre.focus();
            }
        }
    });

   // ==========================================
// 4. GUARDAR / ACTUALIZAR (CORREGIDO)
// ==========================================
formCliente.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtenemos el código y los valores del formulario
    const codigo = inputCodigo.value.trim().toUpperCase();
    const nombre = inputNombre.value.trim().toUpperCase();
    const rif = document.getElementById('cl-rif').value.trim().toUpperCase();
    const telefono = document.getElementById('cl-telefono').value.trim();
    const direccion = document.getElementById('cl-direccion').value.trim().toUpperCase();

    if (!codigo) {
        alert("El código es obligatorio.");
        return;
    }

    try {
        // La ruta completa debe ser: usuarios -> ID_LICENCIA -> clientes -> código_del_cliente
        // Esto tiene 4 segmentos (par), por lo que es una referencia válida a un documento.
        const docRef = doc(db, "usuarios", ID_LICENCIA, "clientes", codigo);
        
        await setDoc(docRef, {
            codigo,
            nombre,
            rif,
            telefono,
            direccion,
            updatedAt: serverTimestamp()
        }, { merge: true }); // 'merge: true' ayuda a actualizar sin sobrescribir campos innecesariamente

        alert("✅ Operación exitosa");
        cancelarEdicion();
    } catch (e) { 
        console.error("Error completo:", e);
        alert("Error al guardar: " + e.message); 
    }
});

    function cargarDatosCliente(cl) {
    // 1. CARGAMOS EL CÓDIGO (Esto es lo que faltaba)
    inputCodigo.value = cl.codigo; 
    
    // 2. EL RESTO DE LOS DATOS
    document.getElementById('cliente-id').value = cl.id;
    inputNombre.value = cl.nombre;
    document.getElementById('cl-rif').value = cl.rif || '';
    document.getElementById('cl-telefono').value = cl.telefono || '';
    document.getElementById('cl-direccion').value = cl.direccion || '';
    
    // 3. BLOQUEAMOS EL CÓDIGO PARA QUE NO SE PUEDA EDITAR
    inputCodigo.readOnly = true;
    
    // 4. ACTUALIZAMOS LA UI
    if(formTitle) formTitle.innerHTML = `<i class="fas fa-user-edit"></i> Editar Cliente`;
    if(btnGuardar) btnGuardar.innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR CLIENTE`;
    if(btnCancelar) btnCancelar.style.display = 'block';
    
    inputNombre.focus();
}

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

    window.prepararEdicion = (id) => {
        const c = clientesMaster.find(x => x.id === id);
        if (c) cargarDatosCliente(c);
    };

    window.eliminarCliente = async (id) => {
        if (confirm(`¿Eliminar este cliente?`)) {
            await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
        }
    };
});
