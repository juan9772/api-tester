  let currentCollection = null;
  let allEndpoints = [];
  let selectedEndpoint = null;
  let endpointsByFolder = {};
  let environmentVariables = {
      baseUrl: 'https://api.ejemplo.com',
      apiKey: 'your-api-key-here',
      version: 'v1'
  };

  // Inicialización
  document.addEventListener('DOMContentLoaded', function() {
      setupDropzone();
      setupFileInput();
      displayVariables();
  });

  function showSection(sectionName) {
      // Actualizar navbar
      document.querySelectorAll('.nav-item').forEach(item => {
          item.classList.remove('active');
      });
      event.target.classList.add('active');

      // Mostrar sección correspondiente
      document.querySelectorAll('.section').forEach(section => {
          section.classList.remove('active');
      });
      document.getElementById(sectionName + 'Section').classList.add('active');
  }

  function setupDropzone() {
      const dropzone = document.getElementById('dropzone');
      const fileInput = document.getElementById('fileInput');

      dropzone.addEventListener('click', () => {
          fileInput.click();
      });

      dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
          dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('drag-over');

          const files = e.dataTransfer.files;
          if (files.length > 0) {
              handleFile(files[0]);
          }
      });
  }

  function setupFileInput() {
      const fileInput = document.getElementById('fileInput');
      fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) {
              handleFile(e.target.files[0]);
          }
      });
  }

  function handleFile(file) {
      if (!file.name.toLowerCase().endsWith('.json')) {
          showError('Por favor, selecciona un archivo JSON válido.');
          return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
          try {
              const jsonData = JSON.parse(e.target.result);
              parsePostmanCollection(jsonData);
              document.getElementById("btnendpts").click();
          } catch (error) {
              showError('Error al parsear el archivo JSON: ' + error.message);
          }
      };
      reader.readAsText(file);
  }

  function parsePostmanCollection(collection) {
      try {
          currentCollection = collection;
          allEndpoints = [];
          endpointsByFolder = {};

          // Validar estructura básica
          if (!collection.info || !collection.item) {
              throw new Error('Estructura de colección de Postman inválida');
          }

          // Extraer información de la colección
          const collectionName = collection.info.name || 'Colección sin nombre';
          const collectionDescription = collection.info.description || 'Sin descripción disponible';

          // Extraer variables si existen
          if (collection.variable) {
              extractCollectionVariables(collection.variable);
          }

          // Procesar items recursivamente
          processItems(collection.item, '');

          // Actualizar UI
          updateCollectionInfo(collectionName, collectionDescription);
          displayEndpointsByFolders();
          displayVariables();
          showSuccess(`Colección "${collectionName}" cargada exitosamente con ${allEndpoints.length} endpoints.`);

      } catch (error) {
          showError('Error al procesar la colección: ' + error.message);
      }
  }

  function processItems(items, folderPath) {
      items.forEach((item, index) => {
          if (item.item) {
              // Es una carpeta
              const folderName = folderPath ? `${folderPath}/${item.name}` : item.name;
              processItems(item.item, folderName);
          } else if (item.request) {
              // Es un endpoint
              const endpoint = {
                  id: `${folderPath}_${index}_${Date.now()}`,
                    name: item.name || 'Endpoint sin nombre',
                    folder: folderPath || 'Sin carpeta',
                    method: item.request.method || 'GET',
                    url: extractUrl(item.request.url),
                    headers: extractHeaders(item.request.header),
                    body: extractBody(item.request.body),
                    description: item.request.description || '',
                    auth: item.request.auth || null
              };
              allEndpoints.push(endpoint);

              // Agrupar por carpeta
              const folder = endpoint.folder;
              if (!endpointsByFolder[folder]) {
                  endpointsByFolder[folder] = [];
              }
              endpointsByFolder[folder].push(endpoint);
          }
      });
  }

  function extractUrl(urlObj) {
      if (typeof urlObj === 'string') {
          return urlObj;
      }
      if (urlObj && urlObj.raw) {
          return urlObj.raw;
      }
      if (urlObj && urlObj.host && urlObj.path) {
          const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : urlObj.host;
          const path = Array.isArray(urlObj.path) ? urlObj.path.join('/') : urlObj.path;
          const protocol = urlObj.protocol || 'https';
          return `${protocol}://${host}/${path}`;
      }
      return '';
  }

  function extractHeaders(headers) {
      if (!headers) return [];
      return headers.map(header => ({
          key: header.key || '',
          value: header.value || '',
          disabled: header.disabled || false
      }));
  }

  function extractBody(body) {
      if (!body) return null;
      if (body.mode === 'raw') {
          return {
              mode: 'raw',
              raw: body.raw || ''
          };
      }
      if (body.mode === 'formdata') {
          return {
              mode: 'formdata',
              formdata: body.formdata || []
          };
      }
      return body;
  }

  function extractCollectionVariables(variables) {
      variables.forEach(variable => {
          if (variable.key && variable.value) {
              environmentVariables[variable.key] = variable.value;
          }
      });
  }

  function updateCollectionInfo(name, description) {
      document.getElementById('collectionName').textContent = name;
      document.getElementById('collectionDescription').textContent = description;

      // Calcular estadísticas
      const totalEndpoints = allEndpoints.length;
      const folders = Object.keys(endpointsByFolder).filter(folder => folder !== 'Sin carpeta');
      const methods = allEndpoints.reduce((acc, e) => {
          acc[e.method] = (acc[e.method] || 0) + 1;
          return acc;
      }, {});

      document.getElementById('totalEndpoints').textContent = totalEndpoints;
      document.getElementById('totalFolders').textContent = folders.length;
      document.getElementById('getCount').textContent = methods.GET || 0;
      document.getElementById('postCount').textContent = methods.POST || 0;

      document.getElementById('collectionInfo').classList.add('active');
  }

  function displayEndpointsByFolders() {
      const container = document.getElementById('endpointsList');
      container.innerHTML = '';

      // Ordenar carpetas alfabéticamente
      const sortedFolders = Object.keys(endpointsByFolder).sort();

      sortedFolders.forEach(folderName => {
          const endpoints = endpointsByFolder[folderName];

          // Crear sección de carpeta
          const folderSection = document.createElement('div');
          folderSection.className = 'folder-section';

          // Header de carpeta
          const folderHeader = document.createElement('div');
          folderHeader.className = 'folder-header';
          folderHeader.innerHTML = `
          <span class="folder-toggle">▼</span>
          <span>📁 ${folderName}</span>
          <span style="margin-left: auto; background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;">${endpoints.length}</span>
          `;

          // Contenido de carpeta
          const folderContent = document.createElement('div');
          folderContent.className = 'folder-content';

          // Agregar endpoints
          endpoints.forEach(endpoint => {
              const endpointItem = document.createElement('div');
              endpointItem.className = 'endpoint-item';
              endpointItem.setAttribute('data-id', endpoint.id);
              endpointItem.innerHTML = `
              <div style="display: flex; align-items: center; gap: 10px;">
              <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
              <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">${endpoint.name}</div>
              <div style="font-size: 0.8rem; color: #6b7280; font-family: monospace;">${endpoint.url.substring(0, 50)}${endpoint.url.length > 50 ? '...' : ''}</div>
              </div>
              </div>
              `;

              endpointItem.addEventListener('click', () => selectEndpoint(endpoint));
              folderContent.appendChild(endpointItem);
          });

          // Toggle carpeta
          folderHeader.addEventListener('click', () => {
              folderContent.classList.toggle('collapsed');
              const toggle = folderHeader.querySelector('.folder-toggle');
              toggle.classList.toggle('collapsed');
          });

          folderSection.appendChild(folderHeader);
          folderSection.appendChild(folderContent);
          container.appendChild(folderSection);
      });

      document.getElementById('endpointsGrid').style.display = 'grid';
  }

  function selectEndpoint(endpoint) {
      selectedEndpoint = endpoint;

      // Actualizar UI de selección
      document.querySelectorAll('.endpoint-item').forEach(item => {
          item.classList.remove('active');
      });
      document.querySelector(`[data-id="${endpoint.id}"]`).classList.add('active');

      // Ocultar mensaje por defecto y mostrar contenido
      document.getElementById('endpointDetail').style.display = 'none';
      document.getElementById('endpointDetailContent').style.display = 'block';

      // Mostrar detalles
      document.getElementById('detailMethod').textContent = endpoint.method;
      document.getElementById('detailMethod').className = `method-badge method-${endpoint.method.toLowerCase()}`;
      document.getElementById('detailName').textContent = endpoint.name;
      document.getElementById('requestUrl').value = replaceVariables(endpoint.url);

      // Configurar headers
      setupHeaders(endpoint.headers);

      // Mostrar/ocultar body según método
      const bodyGroup = document.getElementById('bodyGroup');
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
          bodyGroup.style.display = 'block';
          document.getElementById('requestBody').value =
          endpoint.body && endpoint.body.raw ? replaceVariables(endpoint.body.raw) : '';
      } else {
          bodyGroup.style.display = 'none';
      }

      // Ocultar respuesta anterior
      document.getElementById('responseContainer').style.display = 'none';
  }

  function setupHeaders(headers) {
      const container = document.getElementById('headersContainer');
      container.innerHTML = '';

      if (headers && headers.length > 0) {
          headers.forEach(header => {
              if (!header.disabled) {
                  addHeaderRow(header.key, replaceVariables(header.value));
              }
          });
      } else {
          // Headers por defecto
          addHeaderRow('Content-Type', 'application/json');
      }
  }

  function addHeaderRow(key = '', value = '') {
      const container = document.getElementById('headersContainer');
      const row = document.createElement('div');
      row.className = 'header-row';
      row.innerHTML = `
      <input type="text" placeholder="Nombre del header" class="header-key" value="${key}" />
      <input type="text" placeholder="Valor del header" class="header-value" value="${value}" />
      <button type="button" class="remove-header-btn" onclick="removeHeaderRow(this)">✕</button>
      `;
      container.appendChild(row);
  }

  function removeHeaderRow(button) {
      button.parentElement.remove();
  }

  async function executeRequest() {
      if (!selectedEndpoint) return;

      const url = document.getElementById('requestUrl').value.trim();
      if (!url) {
          showError('Por favor, ingresa una URL válida.');
          return;
      }

      // Mostrar loading
      document.getElementById('loading').classList.add('active');
      document.getElementById('executeBtn').disabled = true;
      document.getElementById('responseContainer').style.display = 'none';

      try {
          // Recopilar headers
          const headers = {};
          document.querySelectorAll('.header-row').forEach(row => {
              const key = row.querySelector('.header-key').value.trim();
              const value = replaceVariables(row.querySelector('.header-value').value.trim());
              if (key && value) {
                  headers[key] = value;
              }
          });

          // Configurar opciones de la petición con fetch
          const fetchOptions = {
              method: selectedEndpoint.method,
              headers: headers,
              mode: 'cors',
              credentials: 'omit'
          };

          // Agregar body si es necesario
          if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method)) {
              const body = document.getElementById('requestBody').value.trim();
              if (body) {
                  fetchOptions.body = replaceVariables(body);
              }
          }

          // Aplicar autenticación si existe
          if (selectedEndpoint.auth) {
              applyAuthentication(selectedEndpoint.auth, fetchOptions.headers);
          }

          // Ejecutar petición con fetch
          const startTime = Date.now();
          const response = await fetch(url, fetchOptions);
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Procesar respuesta
          let responseBody;
          let responseHeaders = {};

          // Extraer headers de respuesta
          response.headers.forEach((value, key) => {
              responseHeaders[key] = value;
          });

          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
              try {
                  responseBody = await response.json();
                  responseBody = JSON.stringify(responseBody, null, 2);
              } catch (e) {
                  responseBody = await response.text();
              }
          } else if (contentType.includes('text/')) {
              responseBody = await response.text();
          } else {
              responseBody = `Contenido binario (${contentType})`;
          }

          // Mostrar respuesta
          displayResponse({
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: responseBody,
              duration: duration,
              url: url,
              method: selectedEndpoint.method
          });

      } catch (error) {
          displayResponse({
              status: 0,
              statusText: 'Network Error',
              headers: {},
              body: `Error de conexión: ${error.message}\n\nPosibles causas:\n- CORS policy\n- Servidor no disponible\n- URL incorrecta\n- Problema de red`,
              duration: 0,
              url: url,
              method: selectedEndpoint.method,
              error: true
          });
      } finally {
          document.getElementById('loading').classList.remove('active');
          document.getElementById('executeBtn').disabled = false;
      }
  }

  function displayResponse(responseData) {
      const container = document.getElementById('responseContainer');
      const statusBadge = document.getElementById('statusBadge');
      const responseBody = document.getElementById('responseBody');

      // Configurar status badge
      const statusText = `${responseData.status} ${responseData.statusText} • ${responseData.duration}ms`;
      statusBadge.textContent = statusText;
      statusBadge.className = 'status-badge';

      if (responseData.error || responseData.status === 0) {
          statusBadge.classList.add('status-error');
      } else if (responseData.status >= 200 && responseData.status < 300) {
          statusBadge.classList.add('status-success');
      } else if (responseData.status >= 400) {
          statusBadge.classList.add('status-error');
      } else {
          statusBadge.classList.add('status-info');
      }

      // Formatear respuesta completa
      let fullResponse = '';

      // Información de la petición
      fullResponse += `// Petición realizada\n`;
      fullResponse += `${responseData.method} ${responseData.url}\n\n`;

      // Headers de respuesta
      if (Object.keys(responseData.headers).length > 0) {
          fullResponse += `// Headers de respuesta\n`;
          Object.entries(responseData.headers).forEach(([key, value]) => {
              fullResponse += `${key}: ${value}\n`;
          });
          fullResponse += `\n`;
      }

      // Body de respuesta
      fullResponse += `// Body de respuesta\n`;
      fullResponse += responseData.body;

      responseBody.textContent = fullResponse;
      container.style.display = 'block';
  }

  function applyAuthentication(auth, headers) {
      if (!auth || !headers) return;

      switch (auth.type) {
          case 'bearer':
              if (auth.bearer && auth.bearer[0] && auth.bearer[0].value) {
                  headers['Authorization'] = `Bearer ${replaceVariables(auth.bearer[0].value)}`;
              }
              break;
          case 'basic':
              if (auth.basic) {
                  const username = auth.basic.find(item => item.key === 'username')?.value || '';
                  const password = auth.basic.find(item => item.key === 'password')?.value || '';
                  const encoded = btoa(`${replaceVariables(username)}:${replaceVariables(password)}`);
                  headers['Authorization'] = `Basic ${encoded}`;
              }
              break;
          case 'apikey':
              if (auth.apikey) {
                  const keyItem = auth.apikey.find(item => item.key === 'key');
                  const valueItem = auth.apikey.find(item => item.key === 'value');
                  if (keyItem && valueItem) {
                      headers[keyItem.value] = replaceVariables(valueItem.value);
                  }
              }
              break;
      }
  }

  // Funciones de Variables
  function displayVariables() {
      const container = document.getElementById('variablesGrid');
      container.innerHTML = '';

      if (Object.keys(environmentVariables).length === 0) {
          container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 40px;">
          <div style="font-size: 3rem; margin-bottom: 15px;">🔧</div>
          <h3>No hay variables definidas</h3>
          <p>Agrega variables para reutilizar valores en tus endpoints</p>
          </div>
          `;
          return;
      }

      Object.entries(environmentVariables).forEach(([key, value]) => {
          const variableItem = document.createElement('div');
          variableItem.className = 'variable-item';
          variableItem.innerHTML = `
          <div class="variable-name">{{${key}}}</div>
          <div class="variable-value" id="var-${key}">${value}</div>
          <div class="variable-controls">
          <button class="btn-small" onclick="editVariable('${key}')">✏️ Editar</button>
          <button class="btn-small danger" onclick="deleteVariable('${key}')">🗑️ Eliminar</button>
          </div>
          <div class="variable-usage">
          Usada en: ${getVariableUsage(key)} lugar(es)
          </div>
          `;
          container.appendChild(variableItem);
      });
  }

  function getVariableUsage(variableName) {
      let count = 0;
      const pattern = new RegExp(`\\{\\{${variableName}\\}\\}`, 'g');

      allEndpoints.forEach(endpoint => {
          if (pattern.test(endpoint.url)) {
              count++;
          }
          endpoint.headers.forEach(header => {
              if (pattern.test(header.value)) {
                  count++;
              }
          });
          if (endpoint.body && endpoint.body.raw && pattern.test(endpoint.body.raw)) {
              count++;
          }
      });

      return count;
  }

  function toggleAddVariable() {
      const form = document.getElementById('addVariableForm');
      form.classList.toggle('active');
      if (form.classList.contains('active')) {
          document.getElementById('newVariableName').focus();
      } else {
          document.getElementById('newVariableName').value = '';
          document.getElementById('newVariableValue').value = '';
      }
  }

  function addVariable() {
      const name = document.getElementById('newVariableName').value.trim();
      const value = document.getElementById('newVariableValue').value.trim();

      if (!name || !value) {
          showError('Por favor, completa ambos campos para la variable.');
          return;
      }

      if (environmentVariables.hasOwnProperty(name)) {
          if (!confirm(`La variable "${name}" ya existe. ¿Deseas sobrescribirla?`)) {
              return;
          }
      }

      environmentVariables[name] = value;
      displayVariables();

      // Limpiar formulario
      document.getElementById('newVariableName').value = '';
      document.getElementById('newVariableValue').value = '';
      toggleAddVariable();

      showSuccess(`Variable "${name}" agregada exitosamente.`);
  }

  function editVariable(key) {
      const valueElement = document.getElementById(`var-${key}`);
      const currentValue = environmentVariables[key];

      // Crear input de edición
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'variable-input';
      input.value = currentValue;

      // Reemplazar el elemento
      valueElement.style.display = 'none';
      valueElement.parentNode.insertBefore(input, valueElement);
      input.focus();
      input.select();

      // Función para guardar
      const saveEdit = () => {
          const newValue = input.value.trim();
          if (newValue) {
              environmentVariables[key] = newValue;
              displayVariables();
              showSuccess(`Variable "${key}" actualizada.`);
          } else {
              valueElement.style.display = 'block';
              input.remove();
          }
      };

      // Función para cancelar
      const cancelEdit = () => {
          valueElement.style.display = 'block';
          input.remove();
      };

      // Event listeners
      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              saveEdit();
          } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelEdit();
          }
      });
  }

  function deleteVariable(key) {
      if (confirm(`¿Estás seguro de eliminar la variable "${key}"?`)) {
          delete environmentVariables[key];
          displayVariables();
          showSuccess(`Variable "${key}" eliminada.`);
      }
  }

  function replaceVariables(text) {
      if (!text) return text;

      let result = text;
      Object.entries(environmentVariables).forEach(([key, value]) => {
          const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          result = result.replace(pattern, value);
      });

      return result;
  }

  function searchEndpoints(query) {
      const searchTerm = query.toLowerCase();
      const folderSections = document.querySelectorAll('.folder-section');

      folderSections.forEach(section => {
          const folderHeader = section.querySelector('.folder-header');
          const folderContent = section.querySelector('.folder-content');
          const endpointItems = section.querySelectorAll('.endpoint-item');

          let hasVisibleEndpoints = false;

          endpointItems.forEach(item => {
              const text = item.textContent.toLowerCase();
              if (text.includes(searchTerm)) {
                  item.style.display = 'block';
                  hasVisibleEndpoints = true;
              } else {
                  item.style.display = 'none';
              }
          });

          // Mostrar/ocultar carpeta completa
          if (hasVisibleEndpoints || searchTerm === '') {
              section.style.display = 'block';
              if (searchTerm !== '') {
                  // Expandir carpeta si tiene resultados
                  folderContent.classList.remove('collapsed');
                  folderHeader.querySelector('.folder-toggle').classList.remove('collapsed');
              }
          } else {
              section.style.display = 'none';
          }
      });
  }

  function showError(message) {
      // Remover mensajes anteriores
      document.querySelectorAll('.error, .success').forEach(el => el.remove());

      const error = document.createElement('div');
      error.className = 'error';
      error.textContent = message;
      document.querySelector('.main-content').prepend(error);

      setTimeout(() => error.remove(), 5000);
  }

  function showSuccess(message) {
      // Remover mensajes anteriores
      document.querySelectorAll('.error, .success').forEach(el => el.remove());

      const success = document.createElement('div');
      success.className = 'success';
      success.textContent = message;
      document.querySelector('.main-content').prepend(success);

      setTimeout(() => success.remove(), 5000);
  }

  // Atajos de teclado
  document.addEventListener('keydown', function(e) {
      // Ctrl/Cmd + E para ejecutar petición
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
          e.preventDefault();
          if (selectedEndpoint && document.getElementById('endpointsSection').classList.contains('active')) {
              executeRequest();
          }
      }

      // Escape para limpiar selección
      if (e.key === 'Escape') {
          if (selectedEndpoint) {
              document.getElementById('endpointDetail').style.display = 'block';
              document.getElementById('endpointDetailContent').style.display = 'none';
              document.querySelectorAll('.endpoint-item').forEach(item => {
                  item.classList.remove('active');
              });
              selectedEndpoint = null;
          }
      }
  });

  // Enter para agregar variable
  document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && document.getElementById('variablesSection').classList.contains('active')) {
          const addForm = document.getElementById('addVariableForm');
          if (addForm.classList.contains('active')) {
              const nameInput = document.getElementById('newVariableName');
              const valueInput = document.getElementById('newVariableValue');
              if (document.activeElement === nameInput || document.activeElement === valueInput) {
                  e.preventDefault();
                  addVariable();
              }
          }
      }
  });
