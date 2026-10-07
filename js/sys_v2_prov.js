import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ID_LICENCIA = localStorage.getItem('youcontrol_empresa_id');
let proveedoresMaster = [];
let indiceRes = -1;

// --- FUNCIONES GLOBALES (Para interacción con el DOM) ---
window.cargarDatosProveedor = (p) => {
    document.getElementById('proveedor-id').value = p.id;
    document.getElementById('pr-codigo').value = p.codigo;
    document.getElementById('pr-codigo').readOnly = true;
    document.getElementById('pr-nombre').value = p.nombre;
    document.getElementById('pr-rif').value = p.rif || '';
    document.getElementById('pr-telefono').value = p.telefono || '';
    document.getElementById('pr-direccion').value = p.direccion || '';
    document.getElementById('btn-guardar-proveedor').innerHTML = `<i class="fas fa-sync-alt"></i> ACTUALIZAR`;
    document.getElementById('btn-cancelar-edicion').style.display = 'block';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    document.getElementById('pr-nombre').focus();
    const list = document.getElementById('lista-resultados');
    if (list) list.style.display = 'none';
};

window.prepararEdicion = (id) => {
    const p = proveedoresMaster.find(x => x.id === id);
    if (p) window.cargarDatosProveedor(p);
};

window.eliminarProveedor = async (id) => {
    if (confirm("¿Eliminar este proveedor?")) {
        try {
            await deleteDoc(doc(db, "usuarios", ID_LICENCIA, "proveedores", id));
        } catch (error) {
            alert("Error al eliminar proveedor: " + error.message);
        }
    }
};

function resetearFormulario() {
    const form = document.getElementById('form-proveedor');
    if (form) form.reset();
    document.getElementById('pr-codigo').readOnly = false;
    document.getElementById('btn-guardar-proveedor').innerHTML = `GUARDAR PROVEEDOR`;
    document.getElementById('btn-cancelar-edicion').style.display = 'none';
    document.getElementById('aviso-no-registrado').style.display = 'none';
    const list = document.getElementById('lista-resultados');
    if (list) list.style.display = 'none';
}

// --- LÓGICA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const formProveedor = document.getElementById('form-proveedor');
    const inputCodigo = document.getElementById('pr-codigo');
    const listaResultados = document.getElementById('lista-resultados');
    const inputBuscar = document.getElementById('buscar-proveedor');
    const btnCancelar = document.getElementById('btn-cancelar-edicion');

    if (btnCancelar) btnCancelar.addEventListener('click', resetearFormulario);

    // Función para renderizar filas en la tabla
    const renderTabla = (lista) => {
        const tabla = document.getElementById('tabla-proveedores');
        if (tabla) {
            tabla.innerHTML = lista.map(p => `
                <tr>
                    <td>${p.codigo}</td>
                    <td><b>${p.nombre}</b></td>
                    <td>${p.rif || '-'}</td>
                    <td>
                        <button class="btn-table" onclick="window.prepararEdicion('${p.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-table" onclick="window.eliminarProveedor('${p.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    };

    // 1. Carga de datos en tiempo real desde Firestore
    onSnapshot(collection(db, "usuarios", ID_LICENCIA, "proveedores"), (snapshot) => {
        proveedoresMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTabla(proveedoresMaster);
    });

    // 2. Filtro dinámico en la tabla
    if (inputBuscar) {
        inputBuscar.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtrados = proveedoresMaster.filter(p => 
                p.nombre?.toLowerCase().includes(term) || 
                p.codigo?.toLowerCase().includes(term) ||
                p.rif?.toLowerCase().includes(term)
            );
            renderTabla(filtrados);
        });
    }

    // 3. Autocompletar / Buscador dinámico por Código
    inputCodigo.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        indiceRes = -1;
        if (term.length < 2) { 
            if (listaResultados) listaResultados.style.display = 'none'; 
            return; 
        }

        const filtrados = proveedoresMaster.filter(p => 
            p.nombre?.toLowerCase().includes(term) || 
            p.codigo?.toLowerCase().includes(term)
        );

        if (listaResultados && filtrados.length > 0) {
            listaResultados.style.display = 'block';
            listaResultados.innerHTML = filtrados.map((p, i) => `
                <div class="item-res" id="res-${i}" data-id="${p.id}">
                    ${p.nombre} (Cod: ${p.codigo})
                </div>
            `).join('');

            document.querySelectorAll('.item-res').forEach(el => {
                el.onclick = () => {
                    const proveedor = proveedoresMaster.find(x => x.id === el.dataset.id);
                    if (proveedor) window.cargarDatosProveedor(proveedor);
                };
            });
        } else {
            if (listaResultados) listaResultados.style.display = 'none';
        }
    });

    // 4. Navegación por teclado dentro del autocompletar
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
                const proveedor = proveedoresMaster.find(p => p.codigo?.toUpperCase() === term);
                if (proveedor) {
                    window.cargarDatosProveedor(proveedor);
                } else {
                    document.getElementById('aviso-no-registrado').style.display = 'block';
                    document.getElementById('pr-nombre').focus();
                }
            }
        }
    });

    // 5. Guardar / Actualizar Registro
    if (formProveedor) {
        formProveedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = inputCodigo.value.trim().toUpperCase();
            if (!codigo) return alert("Ingrese un código válido.");

            try {
                await setDoc(doc(db, "usuarios", ID_LICENCIA, "proveedores", codigo), {
                    codigo,
                    nombre: document.getElementById('pr-nombre').value.trim().toUpperCase(),
                    rif: document.getElementById('pr-rif').value.trim().toUpperCase(),
                    telefono: document.getElementById('pr-telefono').value.trim(),
                    direccion: document.getElementById('pr-direccion').value.trim().toUpperCase(),
                    updatedAt: serverTimestamp()
                }, { merge: true });

                alert("✅ Proveedor guardado con éxito");
                resetearFormulario();
            } catch (error) {
                alert("Error al guardar: " + error.message);
            }
        });
    }
});
