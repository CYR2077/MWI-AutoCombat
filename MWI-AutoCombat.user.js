// ==UserScript==
// @name         MWI-AutoCombat
// @name:zh-CN   MWI自动战斗助手
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Auto-manage game queue(自动9战)
// @author       XIxixi297
// @license      GPL3
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=milkywayidle.com
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL https://update.greasyfork.org/scripts/538205/MWI-AutoCombat.user.js
// @updateURL https://update.greasyfork.org/scripts/538205/MWI-AutoCombat.meta.js
// ==/UserScript==

/**
 * 关于使用本插件可能存在的脚本行为说明：
 *
 * 《游戏规则》
 *
 * 4.机器人、脚本和扩展
 *
 *  4.1禁止机器人: 请勿使用任何自动化程序代替你操作游戏。
 *  4.2脚本和扩展: 任何脚本或扩展程序都不得为玩家执行任何操作(向服务器发送任何请求)， 仅限使用于显示信息或改进用户界面 (例如: 显示战斗摘要、跟踪掉落、将按钮移动到不同位置)。
 *
 * 请仔细阅读游戏规则条款后，再选择是否安装使用本插件，谢谢！
 */

(function (workerScript) {
	if (!/MSIE 10/i.test (navigator.userAgent)) {
		try {
			var blob = new Blob (["\
var fakeIdToId = {};\
onmessage = function (event) {\
	var data = event.data,\
		name = data.name,\
		fakeId = data.fakeId,\
		time;\
	if(data.hasOwnProperty('time')) {\
		time = data.time;\
	}\
	switch (name) {\
		case 'setInterval':\
			fakeIdToId[fakeId] = setInterval(function () {\
				postMessage({fakeId: fakeId});\
			}, time);\
			break;\
		case 'clearInterval':\
			if (fakeIdToId.hasOwnProperty (fakeId)) {\
				clearInterval(fakeIdToId[fakeId]);\
				delete fakeIdToId[fakeId];\
			}\
			break;\
		case 'setTimeout':\
			fakeIdToId[fakeId] = setTimeout(function () {\
				postMessage({fakeId: fakeId});\
				if (fakeIdToId.hasOwnProperty (fakeId)) {\
					delete fakeIdToId[fakeId];\
				}\
			}, time);\
			break;\
		case 'clearTimeout':\
			if (fakeIdToId.hasOwnProperty (fakeId)) {\
				clearTimeout(fakeIdToId[fakeId]);\
				delete fakeIdToId[fakeId];\
			}\
			break;\
	}\
}\
"]);
			// Obtain a blob URL reference to our worker 'file'.
			workerScript = window.URL.createObjectURL(blob);
		} catch (error) {
			/* Blob is not supported, use external script instead */
		}
	}
	var worker,
		fakeIdToCallback = {},
		lastFakeId = 0,
		maxFakeId = 0x7FFFFFFF, // 2 ^ 31 - 1, 31 bit, positive values of signed 32 bit integer
		logPrefix = 'HackTimer.js by turuslan: ';
	if (typeof (Worker) !== 'undefined') {
		function getFakeId () {
			do {
				if (lastFakeId == maxFakeId) {
					lastFakeId = 0;
				} else {
					lastFakeId ++;
				}
			} while (fakeIdToCallback.hasOwnProperty (lastFakeId));
			return lastFakeId;
		}
		try {
			worker = new Worker (workerScript);
			window.setInterval = function (callback, time /* , parameters */) {
				var fakeId = getFakeId ();
				fakeIdToCallback[fakeId] = {
					callback: callback,
					parameters: Array.prototype.slice.call(arguments, 2)
				};
				worker.postMessage ({
					name: 'setInterval',
					fakeId: fakeId,
					time: time
				});
				return fakeId;
			};
			window.clearInterval = function (fakeId) {
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					delete fakeIdToCallback[fakeId];
					worker.postMessage ({
						name: 'clearInterval',
						fakeId: fakeId
					});
				}
			};
			window.setTimeout = function (callback, time /* , parameters */) {
				var fakeId = getFakeId ();
				fakeIdToCallback[fakeId] = {
					callback: callback,
					parameters: Array.prototype.slice.call(arguments, 2),
					isTimeout: true
				};
				worker.postMessage ({
					name: 'setTimeout',
					fakeId: fakeId,
					time: time
				});
				return fakeId;
			};
			window.clearTimeout = function (fakeId) {
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					delete fakeIdToCallback[fakeId];
					worker.postMessage ({
						name: 'clearTimeout',
						fakeId: fakeId
					});
				}
			};
			worker.onmessage = function (event) {
				var data = event.data,
					fakeId = data.fakeId,
					request,
					parameters,
					callback;
				if (fakeIdToCallback.hasOwnProperty(fakeId)) {
					request = fakeIdToCallback[fakeId];
					callback = request.callback;
					parameters = request.parameters;
					if (request.hasOwnProperty ('isTimeout') && request.isTimeout) {
						delete fakeIdToCallback[fakeId];
					}
				}
				if (typeof (callback) === 'string') {
					try {
						callback = new Function (callback);
					} catch (error) {
						console.log (logPrefix + 'Error parsing callback code string: ', error);
					}
				}
				if (typeof (callback) === 'function') {
					callback.apply (window, parameters);
				}
			};
			worker.onerror = function (event) {
				console.log (event);
			};
		} catch (error) {
			console.log (logPrefix + 'Initialisation failed');
			console.error (error);
		}
	} else {
		console.log (logPrefix + 'Initialisation failed - HTML5 Web Worker is not supported');
	}
}) ('HackTimerWorker.js');

(function () {
    'use strict';

    // Language detection and internationalization
    const isChineseUser = () => {
        const lang = navigator.language.toLowerCase();
        return lang.startsWith('zh');
    };

    const translations = {
        zh: {
            title: '自动战斗助手',
            selectTask: '选择任务:',
            executionCount: '执行次数:',
            startAuto: '开始挂机',
            stopAuto: '停止挂机',
            noTasksFound: '未找到任务 (请初始化)',
            initializeTasks: '初始化战斗任务列表',
            status: {
                waitingToStart: '状态: 等待开始',
                invalidNumber: '请输入1-9999999999之间的整数！',
                invalidCountSet: '执行次数无效，已设置为1次',
                startingAuto: '开始挂机',
                times: '次',
                stopped: '已停止挂机',
                addedToQueue: '已添加到队列',
                addToQueueFailed: '添加到队列失败',
                queueNotFull: '队列未满，添加新任务',
                queueStatus: '队列状态',
                queueFull: '队列已满，等待队列消化',
                executionError: '执行出错',
                timeout: '超时，停止执行'
            }
        },
        en: {
            title: 'MWI-AutoCombat',
            selectTask: 'Select Task:',
            executionCount: 'Execution Count:',
            startAuto: 'Start Auto',
            stopAuto: 'Stop Auto',
            noTasksFound: 'No tasks found (Please initialize)',
            initializeTasks: 'Initialize Battle Task List',
            status: {
                waitingToStart: 'Status: Waiting to start',
                invalidNumber: 'Please enter an integer between 1-9999999999!',
                invalidCountSet: 'Invalid execution count, set to 1',
                startingAuto: 'Starting automation',
                times: 'times',
                stopped: 'Automation stopped',
                addedToQueue: 'Added to queue',
                addToQueueFailed: 'Failed to add to queue',
                queueNotFull: 'Queue not full, adding new task',
                queueStatus: 'Queue status',
                queueFull: 'Queue is full, waiting for queue to process',
                executionError: 'Execution error',
                timeout: 'Timeout, stopping execution'
            }
        }
    };

    const t = translations[isChineseUser() ? 'zh' : 'en'];

    let isRunning = false;
    let retryCount = 0;
    let currentConfig = {
        planetIndex: 0,
        battleCount: 5,
        retryDelay: 30000,
        maxRetries: 30
    };

    // Drag-related variables
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // Storage keys
    const STORAGE_KEYS = {
        PLANET_INDEX: 'automation_planet_index',
        BATTLE_COUNT: 'automation_battle_count'
    };

    // Save settings to storage
    function saveSettings() {
        const planetSelect = document.getElementById('planet-select');
        const battleInput = document.getElementById('battle-count');

        if (planetSelect && battleInput) {
            GM_setValue(STORAGE_KEYS.PLANET_INDEX, planetSelect.value);
            GM_setValue(STORAGE_KEYS.BATTLE_COUNT, battleInput.value);
        }
    }

    // Load settings from storage
    function loadSettings() {
        const savedPlanetIndex = GM_getValue(STORAGE_KEYS.PLANET_INDEX, '0');
        const savedBattleCount = GM_getValue(STORAGE_KEYS.BATTLE_COUNT, '9');

        return {
            planetIndex: savedPlanetIndex,
            battleCount: savedBattleCount
        };
    }

    // Apply saved settings to UI
    function applySettings() {
        const settings = loadSettings();
        const planetSelect = document.getElementById('planet-select');
        const battleInput = document.getElementById('battle-count');

        if (planetSelect && battleInput) {
            // Restore execution count
            battleInput.value = settings.battleCount;

            // Restore planet selection (need to wait for options to load)
            if (planetSelect.options.length > 0) {
                const planetIndex = parseInt(settings.planetIndex);
                if (planetIndex < planetSelect.options.length) {
                    planetSelect.value = settings.planetIndex;
                }
            }
        }
    }

    function createUI() {
        const container = document.createElement('div');
        container.id = 'queue-automation-panel';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 160px;
            background: rgba(44, 62, 80, 0.95);
            color: white;
            border-radius: 10px;
            padding: 10px 15px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            backdrop-filter: blur(5px);
            transition: opacity 0.3s ease;
        `;

        const titleBar = document.createElement('div');
        titleBar.id = 'title-bar';
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            cursor: move;
            user-select: none;
        `;

        const title = document.createElement('h3');
        title.id = 'panel-title';
        title.textContent = t.title;
        title.style.cssText = `
            margin: 0;
            color: #3498db;
            border: none;
            padding-bottom: 0;
            flex: 1;
            text-align: center;
            cursor: move;
            font-size: 14px;
        `;

        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-button';
        toggleButton.textContent = '+';  // 修改为 + 号表示可展开
        toggleButton.style.cssText = `
            width: 25px;
            height: 25px;
            border: none;
            border-radius: 50%;
            background: #e74c3c;
            color: white;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
            margin-left: 10px;
            flex-shrink: 0;
            transition: filter 0.3s ease;
        `;

        toggleButton.addEventListener('mouseenter', () => {
            toggleButton.style.filter = 'brightness(110%)';
        });

        toggleButton.addEventListener('mouseleave', () => {
            toggleButton.style.filter = 'brightness(100%)';
        });

        titleBar.appendChild(title);
        titleBar.appendChild(toggleButton);

        const content = document.createElement('div');
        content.id = 'panel-content';
        content.style.display = 'none';

        const planetLabel = document.createElement('label');
        planetLabel.textContent = t.selectTask;
        planetLabel.style.cssText = 'display: block; margin-bottom: 5px; font-weight: bold;';

        const planetSelect = document.createElement('select');
        planetSelect.id = 'planet-select';
        planetSelect.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-bottom: 15px;
            border: none;
            border-radius: 5px;
            background: rgba(52, 73, 94, 0.8);
            color: white;
            font-size: 14px;
        `;

        const battleLabel = document.createElement('label');
        battleLabel.textContent = t.executionCount;
        battleLabel.style.cssText = 'display: block; margin-bottom: 5px; font-weight: bold;';

        const battleInput = document.createElement('input');
        battleInput.id = 'battle-count';
        battleInput.type = 'number';
        battleInput.value = '9';
        battleInput.min = '1';
        battleInput.max = '9999999999';
        battleInput.step = '1';
        battleInput.style.cssText = `
            width: 100%;
            padding: 8px;
            margin-bottom: 15px;
            border: none;
            border-radius: 5px;
            background: rgba(52, 73, 94, 0.8);
            color: white;
            font-size: 14px;
            box-sizing: border-box;
        `;

        // Prevent decimal input
        battleInput.addEventListener('keydown', function(e) {
            if (e.key === '.' || e.key === 'e' || e.key === '-') {
                e.preventDefault();
            }
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 15px;';

        const startButton = document.createElement('button');
        startButton.id = 'start-button';
        startButton.textContent = t.startAuto;
        startButton.style.cssText = `
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 5px;
            background: #27ae60;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: filter 0.3s ease, opacity 0.3s ease;
        `;

        const stopButton = document.createElement('button');
        stopButton.id = 'stop-button';
        stopButton.textContent = t.stopAuto;
        stopButton.disabled = true;
        stopButton.style.cssText = `
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 5px;
            background: #e74c3c;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: filter 0.3s ease, opacity 0.3s ease;
            opacity: 0.5;
        `;

        // Add hover effects
        [startButton, stopButton].forEach(button => {
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    button.style.filter = 'brightness(110%)';
                }
            });

            button.addEventListener('mouseleave', () => {
                button.style.filter = 'brightness(100%)';
            });
        });

        const statusDiv = document.createElement('div');
        statusDiv.id = 'status-display';
        statusDiv.style.cssText = `
            background: rgba(52, 73, 94, 0.8);
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            height: 120px;
            font-size: 12px;
            line-height: 1.4;
            overflow-y: auto;
        `;
        statusDiv.innerHTML = `<div>${t.status.waitingToStart}</div>`;

        const refreshButton = document.createElement('button');
        refreshButton.textContent = t.initializeTasks;
        refreshButton.style.cssText = `
            width: 100%;
            padding: 5px;
            margin-top: 10px;
            border: none;
            border-radius: 5px;
            background: #9b59b6;
            color: white;
            font-size: 12px;
            cursor: pointer;
            transition: filter 0.3s ease;
        `;

        refreshButton.addEventListener('mouseenter', () => {
            refreshButton.style.filter = 'brightness(110%)';
        });

        refreshButton.addEventListener('mouseleave', () => {
            refreshButton.style.filter = 'brightness(100%)';
        });

        refreshButton.addEventListener('click', ()=>{
            document.getElementsByClassName("NavigationBar_nav__3uuUl")[13].click();
            document.getElementsByClassName("MuiBadge-root TabsComponent_badge__1Du26 css-1rzb3uu")[0].click();
            initializePlanetOptions();
        });

        content.appendChild(planetLabel);
        content.appendChild(planetSelect);
        content.appendChild(battleLabel);
        content.appendChild(battleInput);
        content.appendChild(buttonContainer);
        buttonContainer.appendChild(startButton);
        buttonContainer.appendChild(stopButton);
        content.appendChild(statusDiv);
        content.appendChild(refreshButton);

        container.appendChild(titleBar);
        container.appendChild(content);

        document.body.appendChild(container);

        initializePlanetOptions();
        bindEvents();
        setupDragFunctionality();
    }

    function setupDragFunctionality() {
        const container = document.getElementById('queue-automation-panel');
        const titleBar = document.getElementById('title-bar');
        const title = document.getElementById('panel-title');

        // Add drag cursor for draggable areas
        function addDragCursor(element) {
            element.addEventListener('mouseenter', (e) => {
                if (e.target.id !== 'toggle-button') {
                    element.style.cursor = 'move';
                }
            });
        }

        addDragCursor(titleBar);
        addDragCursor(title);

        function startDrag(e) {
            if (e.target.id === 'toggle-button') return;

            isDragging = true;
            const rect = container.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            container.style.transition = 'none';
            container.style.opacity = '0.8';

            e.preventDefault();
        }

        titleBar.addEventListener('mousedown', startDrag);
        title.addEventListener('mousedown', startDrag);

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            const maxX = window.innerWidth - container.offsetWidth;
            const maxY = window.innerHeight - container.offsetHeight;

            container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            container.style.right = 'auto';

            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                container.style.transition = 'opacity 0.3s ease';
                container.style.opacity = '0.95';
            }
        });

        container.addEventListener('mouseenter', () => {
            if (!isDragging) {
                container.style.opacity = '1';
            }
        });

        container.addEventListener('mouseleave', () => {
            if (!isDragging) {
                container.style.opacity = '0.95';
            }
        });
    }

    function bindEvents() {
        const battleInput = document.getElementById('battle-count');
        const planetSelect = document.getElementById('planet-select');

        battleInput.addEventListener('input', function(e) {
            let value = this.value;
            value = value.replace(/[^\d]/g, '');

            if (value === '') {
                value = '1';
            } else {
                const num = parseInt(value);
                if (num < 1) value = '1';
                if (num > 9999999999) value = '9999999999';
            }

            this.value = value;
            // Save settings in real time
            saveSettings();
        });

        battleInput.addEventListener('blur', function() {
            if (this.value === '') {
                this.value = '1';
            }
            saveSettings();
        });

        // Listen for planet selection changes
        planetSelect.addEventListener('change', function() {
            saveSettings();
        });

        document.getElementById('start-button').addEventListener('click', () => {
            const battleCount = parseInt(document.getElementById('battle-count').value);

            if (!Number.isInteger(battleCount) || battleCount < 1 || battleCount > 9999999999) {
                updateStatus(t.status.invalidNumber, 'error');
                return;
            }

            if (!isRunning) {
                updateConfig();
                startAutomation();
            }
        });

        document.getElementById('stop-button').addEventListener('click', stopAutomation);

        const toggleButton = document.getElementById('toggle-button');
        const container = document.getElementById('queue-automation-panel');
        const content = document.getElementById('panel-content');
        const title = document.getElementById('panel-title');

        let isMinimized = true;  // 修改为 true，表示默认是折叠状态

        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();

            if (isMinimized) {
                // 展开
                content.style.display = 'block';
                container.style.width = '300px';
                container.style.padding = '20px';
                title.style.borderBottom = '2px solid #3498db';
                title.style.paddingBottom = '10px';
                title.style.fontSize = '';  // 恢复默认字体大小
                toggleButton.textContent = '−';
            } else {
                // 折叠
                content.style.display = 'none';
                container.style.width = '160px';
                container.style.padding = '10px 15px';
                title.style.borderBottom = 'none';
                title.style.paddingBottom = '0';
                title.style.fontSize = '14px';
                toggleButton.textContent = '+';
            }

            isMinimized = !isMinimized;
        });
    }

    function initializePlanetOptions() {
        const planetSelect = document.getElementById('planet-select');
        const planetElements = document.getElementsByClassName("SkillAction_name__2VPXa");
        planetSelect.innerHTML = '';

        if (planetElements.length === 0) {
            const option = document.createElement('option');
            option.value = '0';
            option.textContent = t.noTasksFound;
            planetSelect.appendChild(option);
            return;
        }

        for (let i = 0; i < planetElements.length; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${planetElements[i].textContent || 'Unknown'}`;
            planetSelect.appendChild(option);
        }

        // Apply saved settings after initialization
        setTimeout(() => {
            applySettings();
        }, 100);
    }

    function updateConfig() {
        currentConfig.planetIndex = parseInt(document.getElementById('planet-select').value) || 0;
        const battleCount = parseInt(document.getElementById('battle-count').value);

        if (Number.isInteger(battleCount) && battleCount >= 1 && battleCount <= 9999999999) {
            currentConfig.battleCount = battleCount;
        } else {
            currentConfig.battleCount = 1;
            document.getElementById('battle-count').value = '1';
            updateStatus(t.status.invalidCountSet, 'warning');
        }

        // Save settings when starting
        saveSettings();
    }

    function updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status-display');
        const timestamp = new Date().toLocaleTimeString();
        const colorMap = {
            'info': '#3498db',
            'success': '#27ae60',
            'warning': '#f39c12',
            'error': '#e74c3c'
        };

        const newMessage = document.createElement('div');
        newMessage.style.color = colorMap[type];
        newMessage.textContent = `[${timestamp}] ${message}`;

        // Add new message to bottom
        statusDiv.appendChild(newMessage);

        // Limit message count, keep latest 30
        while (statusDiv.children.length > 30) {
            statusDiv.removeChild(statusDiv.firstChild);
        }

        // Auto scroll to bottom to show latest message
        statusDiv.scrollTop = statusDiv.scrollHeight;
    }

    function startAutomation() {
        isRunning = true;
        retryCount = 0;
        document.getElementById('start-button').disabled = true;
        document.getElementById('start-button').style.opacity = '0.5';
        document.getElementById('stop-button').disabled = false;
        document.getElementById('stop-button').style.opacity = '1';

        const planetSelect = document.getElementById('planet-select').options[currentConfig.planetIndex].text;

        updateStatus(`${t.status.startingAuto} - ${planetSelect}, ${currentConfig.battleCount}${t.status.times}`, 'success');
        ExecuteQueueCheck();
    }

    function stopAutomation() {
        isRunning = false;
        document.getElementById('start-button').disabled = false;
        document.getElementById('start-button').style.opacity = '1';
        document.getElementById('stop-button').disabled = true;
        document.getElementById('stop-button').style.opacity = '0.5';
        updateStatus(t.status.stopped, 'warning');
    }

    function setInputValue(el, value) {
        const lastValue = el.value;
        el.value = value;
        const event = new Event('input', { bubbles: true });
        const tracker = el._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        el.dispatchEvent(event);
    }

    function addTaskToQueue(i, j) {
        if (!isRunning) return;

        try {
            document.getElementsByClassName("NavigationBar_nav__3uuUl")[13].click();
            document.getElementsByClassName("MuiBadge-root TabsComponent_badge__1Du26 css-1rzb3uu")[0].click();

            const planetElement = document.getElementsByClassName("SkillAction_name__2VPXa")[i];
            if (!planetElement) throw new Error(`Task element with index ${i} not found`);
            planetElement.click();

            setTimeout(() => {
                if (!isRunning) return;
                const inputElement = document.getElementsByClassName("Input_input__2-t98")[0];
                if (!inputElement) throw new Error("Input element not found");

                setInputValue(inputElement, j);

                const addButton = document.getElementsByClassName("Button_button__1Fe9z Button_fullWidth__17pVU Button_large__yIDVZ")[0];
                if (!addButton) throw new Error("Add button not found");

                addButton.click();
                updateStatus(t.status.addedToQueue, 'success');
                retryCount = 0;

            }, 300);

        } catch (error) {
            updateStatus(`${t.status.addToQueueFailed}: ${error.message}`, 'error');
        }
    }

    function isQueueExpanded() {
        return !!document.getElementsByClassName("QueuedActions_label__1lTOW")[0];
    }

    function waitAndRetryQueueCheck() {
        if (!isRunning) return;
        retryCount++;
        if (retryCount >= currentConfig.maxRetries) {
            updateStatus(t.status.timeout, 'error');
            stopAutomation();
            return;
        }
        setTimeout(() => {
            if (isRunning) ExecuteQueueCheck();
        }, currentConfig.retryDelay);
    }

    function ExecuteQueueCheck() {
        if (!isRunning) return;
        try {
            const queueElement = document.getElementsByClassName("QueuedActions_queuedActions__2xerL")[0];
            if (!queueElement){
                updateStatus(t.status.queueNotFull, 'success');
                addTaskToQueue(currentConfig.planetIndex, currentConfig.battleCount);
                setTimeout(() => isRunning && ExecuteQueueCheck(), 2000);
                return;
            }

            if (!isQueueExpanded()) {
                queueElement.click();
                return setTimeout(() => isRunning && ExecuteQueueCheck(), 500);
            }

            const labelElement = document.getElementsByClassName("QueuedActions_label__1lTOW")[0];
            const match = labelElement.textContent.match(/\((\d+)\/(\d+)\)/);
            if (!match) throw new Error("Matching number format not found");

            const numerator = parseInt(match[1]);
            const denominator = parseInt(match[2]);
            updateStatus(`${t.status.queueStatus}: ${numerator}/${denominator}`, 'info');

            if (numerator < denominator) {
                updateStatus(t.status.queueNotFull, 'success');
                addTaskToQueue(currentConfig.planetIndex, currentConfig.battleCount);
                setTimeout(() => isRunning && ExecuteQueueCheck(), 2000);
            } else {
                updateStatus(t.status.queueFull, 'warning');
                waitAndRetryQueueCheck();
            }

        } catch (error) {
            updateStatus(t.status.executionError`: ${error.message}`, 'error');
            retryCount < 5 ? waitAndRetryQueueCheck() : stopAutomation();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createUI);
    } else {
        createUI();
    }
})();