// ==UserScript==
// @name         MWI自动战斗助手
// @name:zh-CN   MWI自动战斗助手
// @name:en      MWI-AutoCombat
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  Auto-manage game queue(自动9战)
// @author       XIxixi297
// @license      CC-BY-NC-SA-4.0
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
    if (!/MSIE 10/i.test(navigator.userAgent)) {
        try {
            var blob = new Blob(["var fakeIdToId = {};\nonmessage = function (event) {\n\tvar data = event.data,\n\t\tname = data.name,\n\t\tfakeId = data.fakeId,\n\t\ttime;\n\tif(data.hasOwnProperty('time')) {\n\t\ttime = data.time;\n\t}\n\tswitch (name) {\n\t\tcase 'setInterval':\n\t\t\tfakeIdToId[fakeId] = setInterval(function () {\n\t\t\t\tpostMessage({fakeId: fakeId});\n\t\t\t}, time);\n\t\t\tbreak;\n\t\tcase 'clearInterval':\n\t\t\tif (fakeIdToId.hasOwnProperty (fakeId)) {\n\t\t\t\tclearInterval(fakeIdToId[fakeId]);\n\t\t\t\tdelete fakeIdToId[fakeId];\n\t\t\t}\n\t\t\tbreak;\n\t\tcase 'setTimeout':\n\t\t\tfakeIdToId[fakeId] = setTimeout(function () {\n\t\t\t\tpostMessage({fakeId: fakeId});\n\t\t\t\tif (fakeIdToId.hasOwnProperty (fakeId)) {\n\t\t\t\t\tdelete fakeIdToId[fakeId];\n\t\t\t\t}\n\t\t\t}, time);\n\t\t\tbreak;\n\t\tcase 'clearTimeout':\n\t\t\tif (fakeIdToId.hasOwnProperty (fakeId)) {\n\t\t\t\tclearTimeout(fakeIdToId[fakeId]);\n\t\t\t\tdelete fakeIdToId[fakeId];\n\t\t\t}\n\t\t\tbreak;\n\t}\n}\n"]);
            workerScript = window.URL.createObjectURL(blob);
        } catch (error) {
            /* Blob is not supported, use external script instead */
        }
    }
    var worker,
        fakeIdToCallback = {},
        lastFakeId = 0,
        maxFakeId = 0x7FFFFFFF;
    if (typeof (Worker) !== 'undefined') {
        function getFakeId() {
            do {
                if (lastFakeId == maxFakeId) {
                    lastFakeId = 0;
                } else {
                    lastFakeId++;
                }
            } while (fakeIdToCallback.hasOwnProperty(lastFakeId));
            return lastFakeId;
        }
        try {
            worker = new Worker(workerScript);
            window.setInterval = function (callback, time) {
                var fakeId = getFakeId();
                fakeIdToCallback[fakeId] = {
                    callback: callback,
                    parameters: Array.prototype.slice.call(arguments, 2)
                };
                worker.postMessage({
                    name: 'setInterval',
                    fakeId: fakeId,
                    time: time
                });
                return fakeId;
            };
            window.clearInterval = function (fakeId) {
                if (fakeIdToCallback.hasOwnProperty(fakeId)) {
                    delete fakeIdToCallback[fakeId];
                    worker.postMessage({
                        name: 'clearInterval',
                        fakeId: fakeId
                    });
                }
            };
            window.setTimeout = function (callback, time) {
                var fakeId = getFakeId();
                fakeIdToCallback[fakeId] = {
                    callback: callback,
                    parameters: Array.prototype.slice.call(arguments, 2),
                    isTimeout: true
                };
                worker.postMessage({
                    name: 'setTimeout',
                    fakeId: fakeId,
                    time: time
                });
                return fakeId;
            };
            window.clearTimeout = function (fakeId) {
                if (fakeIdToCallback.hasOwnProperty(fakeId)) {
                    delete fakeIdToCallback[fakeId];
                    worker.postMessage({
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
                    if (request.hasOwnProperty('isTimeout') && request.isTimeout) {
                        delete fakeIdToCallback[fakeId];
                    }
                }
                if (typeof (callback) === 'string') {
                    try {
                        callback = new Function(callback);
                    } catch (error) {
                        console.log('HackTimer.js by turuslan: Error parsing callback code string: ', error);
                    }
                }
                if (typeof (callback) === 'function') {
                    callback.apply(window, parameters);
                }
            };
            worker.onerror = function (event) {
                console.log(event);
            };
        } catch (error) {
            console.log('HackTimer.js by turuslan: Initialisation failed');
            console.error(error);
        }
    } else {
        console.log('HackTimer.js by turuslan: Initialisation failed - HTML5 Web Worker is not supported');
    }
})('HackTimerWorker.js');

(function () {
    'use strict';

    // 语言检测
    const isChineseUser = () => navigator.language.toLowerCase().startsWith('zh');

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

    // 全局状态
    let isRunning = false;
    let retryCount = 0;
    let currentConfig = {
        planetIndex: 0,
        battleCount: 5,
        retryDelay: 30000,
        maxRetries: 30
    };

    // 拖拽状态
    let dragState = {
        isDragging: false,
        offset: { x: 0, y: 0 }
    };

    // 存储键
    const STORAGE_KEYS = {
        PLANET_INDEX: 'automation_planet_index',
        BATTLE_COUNT: 'automation_battle_count'
    };

    // 工具函数
    const utils = {
        saveSettings() {
            const planetSelect = document.getElementById('planet-select');
            const battleInput = document.getElementById('battle-count');
            if (planetSelect && battleInput) {
                GM_setValue(STORAGE_KEYS.PLANET_INDEX, planetSelect.value);
                GM_setValue(STORAGE_KEYS.BATTLE_COUNT, battleInput.value);
            }
        },

        loadSettings() {
            return {
                planetIndex: GM_getValue(STORAGE_KEYS.PLANET_INDEX, '0'),
                battleCount: GM_getValue(STORAGE_KEYS.BATTLE_COUNT, '9')
            };
        },

        applySettings() {
            const settings = this.loadSettings();
            const planetSelect = document.getElementById('planet-select');
            const battleInput = document.getElementById('battle-count');

            if (planetSelect && battleInput) {
                battleInput.value = settings.battleCount;
                if (planetSelect.options.length > 0) {
                    const planetIndex = parseInt(settings.planetIndex);
                    if (planetIndex < planetSelect.options.length) {
                        planetSelect.value = settings.planetIndex;
                    }
                }
            }
        },

        // 统一的事件监听器，支持触摸事件
        addPointerEvents(element, handlers) {
            const events = {
                start: ['mousedown', 'touchstart'],
                move: ['mousemove', 'touchmove'],
                end: ['mouseup', 'touchend', 'touchcancel']
            };

            Object.keys(handlers).forEach(type => {
                events[type]?.forEach(eventName => {
                    element.addEventListener(eventName, handlers[type], { passive: false });
                });
            });
        },

        // 获取指针位置（支持触摸和鼠标）
        getPointerPosition(e) {
            const touch = e.touches?.[0] || e.changedTouches?.[0];
            return {
                x: touch?.clientX || e.clientX,
                y: touch?.clientY || e.clientY
            };
        },

        setInputValue(el, value) {
            const lastValue = el.value;
            el.value = value;
            const event = new Event('input', { bubbles: true });
            const tracker = el._valueTracker;
            if (tracker) {
                tracker.setValue(lastValue);
            }
            el.dispatchEvent(event);
        }
    };

    // UI创建
    function createUI() {
        const container = document.createElement('div');
        container.id = 'queue-automation-panel';
        container.innerHTML = `
            <div id="title-bar">
                <h3 id="panel-title">${t.title}</h3>
                <button id="toggle-button">+</button>
            </div>
            <div id="panel-content" style="display: none;">
                <label>${t.selectTask}</label>
                <select id="planet-select"></select>
                <label>${t.executionCount}</label>
                <input id="battle-count" type="number" value="9" min="1" max="9999999999" step="1">
                <div class="button-container">
                    <button id="start-button">${t.startAuto}</button>
                    <button id="stop-button" disabled>${t.stopAuto}</button>
                </div>
                <div id="status-display">${t.status.waitingToStart}</div>
                <button id="refresh-button">${t.initializeTasks}</button>
            </div>
        `;

        // 应用样式
        applyStyles(container);
        document.body.appendChild(container);

        initializePlanetOptions();
        bindEvents();
        setupDragFunctionality();
    }

    function applyStyles(container) {
        const styles = `
            #queue-automation-panel {
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
                touch-action: none;
                user-select: none;
            }
            #title-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                cursor: move;
            }
            #panel-title {
                margin: 0;
                color: #3498db;
                flex: 1;
                text-align: center;
                font-size: 14px;
            }
            #toggle-button {
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
            }
            #panel-content label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            #panel-content select,
            #panel-content input {
                width: 100%;
                padding: 8px;
                margin-bottom: 15px;
                border: none;
                border-radius: 5px;
                background: rgba(52, 73, 94, 0.8);
                color: white;
                font-size: 14px;
                box-sizing: border-box;
            }
            .button-container {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            .button-container button {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 5px;
                color: white;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                transition: filter 0.3s ease, opacity 0.3s ease;
            }
            #start-button {
                background: #27ae60;
            }
            #stop-button {
                background: #e74c3c;
                opacity: 0.5;
            }
            #stop-button:not(:disabled) {
                opacity: 1;
            }
            #status-display {
                background: rgba(52, 73, 94, 0.8);
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 10px;
                height: 120px;
                font-size: 12px;
                line-height: 1.4;
                overflow-y: auto;
            }
            #refresh-button {
                width: 100%;
                padding: 5px;
                margin-top: 10px;
                border: none;
                border-radius: 5px;
                background: #9b59b6;
                color: white;
                font-size: 12px;
                cursor: pointer;
            }
            button:hover:not(:disabled) {
                filter: brightness(110%);
            }
            .expanded {
                width: 300px !important;
                padding: 20px !important;
            }
            .expanded #panel-title {
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
                font-size: inherit;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // 拖拽功能（支持触摸）
    function setupDragFunctionality() {
        const container = document.getElementById('queue-automation-panel');
        const titleBar = document.getElementById('title-bar');

        utils.addPointerEvents(titleBar, {
            start: (e) => {
                if (e.target.id === 'toggle-button') return;
                
                e.preventDefault();
                dragState.isDragging = true;
                
                const rect = container.getBoundingClientRect();
                const pos = utils.getPointerPosition(e);
                dragState.offset = {
                    x: pos.x - rect.left,
                    y: pos.y - rect.top
                };

                container.style.transition = 'none';
                container.style.opacity = '0.8';
            }
        });

        utils.addPointerEvents(document, {
            move: (e) => {
                if (!dragState.isDragging) return;
                
                e.preventDefault();
                const pos = utils.getPointerPosition(e);
                const x = pos.x - dragState.offset.x;
                const y = pos.y - dragState.offset.y;

                const maxX = window.innerWidth - container.offsetWidth;
                const maxY = window.innerHeight - container.offsetHeight;

                container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
                container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
                container.style.right = 'auto';
            },
            end: () => {
                if (dragState.isDragging) {
                    dragState.isDragging = false;
                    container.style.transition = 'opacity 0.3s ease';
                    container.style.opacity = '0.95';
                }
            }
        });

        // 鼠标悬停效果
        container.addEventListener('mouseenter', () => {
            if (!dragState.isDragging) container.style.opacity = '1';
        });

        container.addEventListener('mouseleave', () => {
            if (!dragState.isDragging) container.style.opacity = '0.95';
        });
    }

    // 事件绑定
    function bindEvents() {
        const battleInput = document.getElementById('battle-count');
        const planetSelect = document.getElementById('planet-select');
        const toggleButton = document.getElementById('toggle-button');
        const container = document.getElementById('queue-automation-panel');
        const content = document.getElementById('panel-content');
        const title = document.getElementById('panel-title');

        let isMinimized = true;

        // 输入验证
        battleInput.addEventListener('input', function() {
            let value = this.value.replace(/[^\d]/g, '');
            if (value === '') value = '1';
            else {
                const num = parseInt(value);
                if (num < 1) value = '1';
                if (num > 9999999999) value = '9999999999';
            }
            this.value = value;
            utils.saveSettings();
        });

        battleInput.addEventListener('blur', function() {
            if (this.value === '') this.value = '1';
            utils.saveSettings();
        });

        battleInput.addEventListener('keydown', function(e) {
            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                e.preventDefault();
            }
        });

        planetSelect.addEventListener('change', utils.saveSettings);

        // 切换展开/折叠
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (isMinimized) {
                content.style.display = 'block';
                container.classList.add('expanded');
                toggleButton.textContent = '−';
            } else {
                content.style.display = 'none';
                container.classList.remove('expanded');
                title.style.borderBottom = 'none';
                title.style.paddingBottom = '0';
                toggleButton.textContent = '+';
            }
            
            isMinimized = !isMinimized;
        });

        // 开始/停止按钮
        document.getElementById('start-button').addEventListener('click', () => {
            const battleCount = parseInt(battleInput.value);
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

        // 刷新按钮
        document.getElementById('refresh-button').addEventListener('click', () => {
            document.getElementsByClassName("NavigationBar_nav__3uuUl")[13].click();
            document.getElementsByClassName("MuiBadge-root TabsComponent_badge__1Du26 css-1rzb3uu")[0].click();
            initializePlanetOptions();
        });
    }

    // 初始化任务选项
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
            option.textContent = planetElements[i].textContent || 'Unknown';
            planetSelect.appendChild(option);
        }

        setTimeout(() => utils.applySettings(), 100);
    }

    // 更新配置
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

        utils.saveSettings();
    }

    // 状态更新
    function updateStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status-display');
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            'info': '#3498db',
            'success': '#27ae60',
            'warning': '#f39c12',
            'error': '#e74c3c'
        };

        const newMessage = document.createElement('div');
        newMessage.style.color = colors[type];
        newMessage.textContent = `[${timestamp}] ${message}`;

        statusDiv.appendChild(newMessage);

        // 保持最新30条消息
        while (statusDiv.children.length > 30) {
            statusDiv.removeChild(statusDiv.firstChild);
        }

        statusDiv.scrollTop = statusDiv.scrollHeight;
    }

    // 自动化控制
    function startAutomation() {
        isRunning = true;
        retryCount = 0;
        
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');
        
        startButton.disabled = true;
        startButton.style.opacity = '0.5';
        stopButton.disabled = false;
        stopButton.style.opacity = '1';

        const planetName = document.getElementById('planet-select').options[currentConfig.planetIndex].text;
        updateStatus(`${t.status.startingAuto} - ${planetName}, ${currentConfig.battleCount}${t.status.times}`, 'success');
        executeQueueCheck();
    }

    function stopAutomation() {
        isRunning = false;
        
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');
        
        startButton.disabled = false;
        startButton.style.opacity = '1';
        stopButton.disabled = true;
        stopButton.style.opacity = '0.5';
        
        updateStatus(t.status.stopped, 'warning');
    }

    // 队列操作
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

                utils.setInputValue(inputElement, j);

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

    function executeQueueCheck() {
        if (!isRunning) return;
        
        try {
            const queueElement = document.getElementsByClassName("QueuedActions_queuedActions__2xerL")[0];
            if (!queueElement) {
                updateStatus(t.status.queueNotFull, 'success');
                addTaskToQueue(currentConfig.planetIndex, currentConfig.battleCount);
                setTimeout(() => isRunning && executeQueueCheck(), 2000);
                return;
            }

            const isExpanded = !!document.getElementsByClassName("QueuedActions_label__1lTOW")[0];
            if (!isExpanded) {
                queueElement.click();
                return setTimeout(() => isRunning && executeQueueCheck(), 500);
            }

            const labelElement = document.getElementsByClassName("QueuedActions_label__1lTOW")[0];
            const match = labelElement.textContent.match(/\((\d+)\/(\d+)\)/);
            if (!match) throw new Error("Matching number format not found");

            const [, numerator, denominator] = match.map(Number);
            updateStatus(`${t.status.queueStatus}: ${numerator}/${denominator}`, 'info');

            if (numerator < denominator) {
                updateStatus(t.status.queueNotFull, 'success');
                addTaskToQueue(currentConfig.planetIndex, currentConfig.battleCount);
                setTimeout(() => isRunning && executeQueueCheck(), 2000);
            } else {
                updateStatus(t.status.queueFull, 'warning');
                waitAndRetryQueueCheck();
            }

        } catch (error) {
            updateStatus(`${t.status.executionError}: ${error.message}`, 'error');
            retryCount < 5 ? waitAndRetryQueueCheck() : stopAutomation();
        }
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
            if (isRunning) executeQueueCheck();
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