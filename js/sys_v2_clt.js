import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = [];
let indiceRes = -1;

document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const tablaClientes = document.getElementById('tabla-clientes');
    const inputCodigo = document.getElementById('cl-codigo');
    const inputBuscar = document.getElementById('buscar-cliente');
    const listaResultados = document.getElementById('lista-resultados'); // Contenedor de sugerencias

    // 1. Escuchar clientes
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderizarTabla(clientesMaster);
    });

    // 2. BUSCADOR INTELIGENTE (Al escribir)
    inputCodigo.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        indiceRes = -1;
        if (term.length < 2) { listaResultados.style.display = 'none'; return; }
        
        const filtrados = clientesMaster.filter(c => c.nombre?.toLowerCase().includes(term) || c.codigo?.toLowerCase().includes(term));
        
        if (filtrados.length > 0) {
            listaResultados.style.display = 'block';
            listaResultados.innerHTML = filtrados.map((c, i) => `
                <div class="item-res" id="res-${i}" onclick="window.cargarDatosClienteByObj('${c.id}')" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                    ${c.nombre} (Cod: ${c.codigo})
                </div>
            `).join('');
        } else {
            listaResultados.style.display = 'none';
        }
    });

    // 3. NAVEGACIÓN CON TECLADO
    inputCodigo.addEventListener('keydown', (e) => {
        const items = listaResultados.querySelectorAll('.item-res');
        if (e.key === 'ArrowDown' && indiceRes < items.length - 1) { 
            indiceRes++; items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white'); 
        } else if (e.key === 'ArrowUp' && indiceRes > 0) { 
            indiceRes--; items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white'); 
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (indiceRes >= 0 && items[indiceRes]) {
                items[indiceRes].click();
            } else {
                const term = inputCodigo.value.trim().toUpperCase();
                const cliente = clientesMaster.find(c => c.codigo?.toUpperCase() === term);
                if (cliente) {
                    window.cargarDatosCliente(cliente);
                    listaResultados.style.display = 'none';
                } else {
                    document.getElementById('aviso-no-registrado').style.display = 'block';
                    document.getElementById('cl-nombre').focus();
                }
            }
        }
    });

    // 4. Guardar
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigo = inputCodigo.value.trim().toUpperCase();
        try {
            await setDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", codigo), {
                codigo,
                nombre: document.getElementById('cl-nombre').value.trim().toUpperCase(),
                rif: document.getElementById('cl-rif').value.trim().toUpperCase(),
                telefono: document.getElementById('cl-telefono').value.trim(),
                direccion: document.getElementById('cl-direccion').value.trim().toUpperCase(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            alert("✅ Operación exitosa");
            formCliente.reset();
            inputCodigo.readOnly = false;
        } catch (e) { alert("Error: " + e.message); }
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

// FUNCIONES GLOBALES
window.cargarDatosClienteByObj = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if(c) window.cargarDatosCliente(c);
    document.getElementById('lista-resultados').style.display = 'none';
};

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
    document.getElementById('cl-nombre').focus();
    document.getElementById('aviso-no-registrado').style.display = 'none';
};

window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) window.cargarDatosCliente(c);
};

window.eliminarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente?")) await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
};
