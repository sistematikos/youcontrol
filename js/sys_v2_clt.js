import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    serverTimestamp, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let clientesMaster = [];
let indiceRes = -1;

// --- FUNCIONES GLOBALES (Para el DOM) ---
window.cargarDatosCliente = (c) => {
    document.getElementById('cliente-id').value = c.id;
    document.getElementById('cl-codigo').value = c.codigo;
    document.getElementById('cl-codigo').readOnly = true;
    document.getElementById('cl-nombre').value = c.nombre;
    document.getElementById('cl-rif').value = c.rif || '';
    document.getElementById('cl-telefono').value = c.telefono || '';
    document.getElementById('cl-direccion').value = c.direccion || '';
    
    document.getElementById('btn-guardar-cliente').innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR CLIENTE`;
    document.getElementById('btn-cancelar-edicion').style.display = 'block';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    document.getElementById('cl-nombre').focus();
    
    const list = document.getElementById('lista-resultados');
    if(list) list.style.display = 'none';
};

window.prepararEdicion = (id) => {
    const c = clientesMaster.find(x => x.id === id);
    if (c) window.cargarDatosCliente(c);
};

window.eliminarCliente = async (id) => {
    if (confirm("¿Eliminar este cliente?")) {
        try {
            await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "clientes", id));
            alert("Cliente eliminado con éxito");
        } catch (error) {
            alert("Error al eliminar: " + error.message);
        }
    }
};

window.limpiarFormulario = () => {
    const formCliente = document.getElementById('form-cliente');
    if(formCliente) formCliente.reset();
    document.getElementById('cliente-id').value = '';
    document.getElementById('cl-codigo').readOnly = false;
    document.getElementById('btn-guardar-cliente').innerHTML = `GUARDAR CLIENTE`;
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    const list = document.getElementById('lista-resultados');
    if(list) list.style.display = 'none';
};

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const formCliente = document.getElementById('form-cliente');
    const inputCodigo = document.getElementById('cl-codigo');
    const listaResultados = document.getElementById('lista-resultados');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', window.limpiarFormulario);
    }

    // 1. Carga de datos en tiempo real
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tabla = document.getElementById('tabla-clientes');
        if(tabla) {
            if (clientesMaster.length === 0) {
                tabla.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay clientes registrados.</td></tr>`;
            } else {
                tabla.innerHTML = clientesMaster.map(c => `
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
        }
    });

    // 2. Buscador Dinámico
    if (inputCodigo) {
        inputCodigo.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            indiceRes = -1;
            if (term.length < 2) { 
                if(listaResultados) listaResultados.style.display = 'none'; 
                document.getElementById('aviso-no-registrado').style.display = 'none';
                return; 
            }
            
            const filtrados = clientesMaster.filter(c => c.nombre?.toLowerCase().includes(term) || c.codigo?.toLowerCase().includes(term));
            
            if (listaResultados && filtrados.length > 0) {
                document.getElementById('aviso-no-registrado').style.display = 'none';
                listaResultados.style.display = 'block';
                listaResultados.innerHTML = filtrados.map((c, i) => `
                    <div class="item-res" id="res-${i}" data-id="${c.id}" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee;">
                        ${c.nombre} (Cod: ${c.codigo})
                    </div>
                `).join('');

                document.querySelectorAll('.item-res').forEach(el => {
                    el.onclick = () => {
                        const cliente = clientesMaster.find(x => x.id === el.dataset.id);
                        if(cliente) window.cargarDatosCliente(cliente);
                    };
                });
            } else {
                if(listaResultados) listaResultados.style.display = 'none';
                document.getElementById('aviso-no-registrado').style.display = 'block';
            }
        });

        // 3. Teclado
        inputCodigo.addEventListener('keydown', (e) => {
            if (!listaResultados || listaResultados.style.display === 'none') return;
            const items = listaResultados.querySelectorAll('.item-res');
            
            if (e.key === 'ArrowDown' && indiceRes < items.length - 1) {
                indiceRes++;
                items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white');
            } else if (e.key === 'ArrowUp' && indiceRes > 0) {
                indiceRes--;
                items.forEach((it, i) => it.style.background = (i === indiceRes) ? '#F1F5F9' : 'white');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (indiceRes >= 0 && items[indiceRes]) {
                    items[indiceRes].click();
                } else {
                    const term = inputCodigo.value.trim().toUpperCase();
                    const cliente = clientesMaster.find(c => c.codigo?.toUpperCase() === term);
                    if (cliente) window.cargarDatosCliente(cliente);
                    else {
                        document.getElementById('aviso-no-registrado').style.display = 'block';
                        document.getElementById('cl-nombre').focus();
                    }
                }
            }
        });
    }

    // 4. Guardar
    if (formCliente) {
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
                window.limpiarFormulario();
            } catch (e) { 
                alert("Error: " + e.message); 
            }
        });
    }
});
