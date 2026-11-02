// ==UserScript==
// @name         Auto Grinder with Captcha Solver
// @namespace    https://github.com/YOUR_USERNAME/auto-grinder
// @version      6.1
// @description  Auto-clicks the main button and Boost, and answers the "Quick check" math prompt.
// @match        https://grinding.tnstats.dev/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/YOUR_USERNAME/auto-grinder/main/auto-grinder.user.js
// @downloadURL  https://raw.githubusercontent.com/YOUR_USERNAME/auto-grinder/main/auto-grinder.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ---------- Config ----------
    const INTERVAL_MS = 20;          // tick speed in milliseconds
    const CAPTCHA_COOLDOWN_MS = 4000; // pause after answering a captcha
    const MAIN_BUTTON_TEXT = 'Music Video';
    const BOOST_TEXT = 'Boost';

    // ---------- State ----------
    let intervalId = null;
    let isRunning = false;
    let lastCaptchaTime = 0;

    // ---------- UI ----------
    const panel = document.createElement('div');
    Object.assign(panel.style, {
        position: 'fixed', top: '25px', right: '25px', zIndex: '999999',
        backgroundColor: '#181920', color: '#fff', padding: '20px 24px',
        borderRadius: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        border: '2px solid #2d323f', fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '12px', minWidth: '220px'
    });

    const title = document.createElement('div');
    title.innerText = 'AUTOFARM CONTROL';
    Object.assign(title.style, {
        fontSize: '12px', fontWeight: '800', letterSpacing: '1.5px', color: '#8f9bba'
    });

    const badge = document.createElement('div');
    Object.assign(badge.style, {
        fontSize: '13px', fontWeight: '700', padding: '6px 14px', borderRadius: '20px'
    });

    const button = document.createElement('button');
    Object.assign(button.style, {
        width: '100%', padding: '14px 0', color: '#fff', border: 'none',
        borderRadius: '10px', cursor: 'pointer', fontSize: '18px',
        fontWeight: '800', letterSpacing: '1px', transition: 'all 0.2s ease'
    });
    button.onmouseover = () => (button.style.transform = 'scale(1.03)');
    button.onmouseout = () => (button.style.transform = 'scale(1)');

    panel.append(title, badge, button);

    function renderUI() {
        if (isRunning) {
            button.innerText = 'STOP';
            button.style.backgroundColor = '#d63031';
            button.style.boxShadow = '0 4px 12px rgba(214,48,49,0.4)';
            badge.innerText = 'STATUS: RUNNING';
            badge.style.color = '#55efc4';
            badge.style.backgroundColor = 'rgba(85,239,196,0.15)';
        } else {
            button.innerText = 'START';
            button.style.backgroundColor = '#00b894';
            button.style.boxShadow = '0 4px 12px rgba(0,184,148,0.4)';
            badge.innerText = 'STATUS: STOPPED';
            badge.style.color = '#ff6b6b';
            badge.style.backgroundColor = 'rgba(255,107,107,0.15)';
        }
    }

    function mountPanel() {
        document.body.appendChild(panel);
    }
    if (document.body) mountPanel();
    else window.addEventListener('DOMContentLoaded', mountPanel);

    renderUI();

    // ---------- Helpers ----------
    function fireClick(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const opts = {
            bubbles: true, cancelable: true, view: window,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        };
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']
            .forEach(type => el.dispatchEvent(new MouseEvent(type, opts)));
        el.click();
        return true;
    }

    function setReactInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, String(value));
        if (input._valueTracker) input._valueTracker.setValue('');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function solveCaptchaIfNeeded() {
        if (Date.now() - lastCaptchaTime < CAPTCHA_COOLDOWN_MS) return true;

        // Find the visible captcha input (below the top of the page, not the display-name box)
        let input = null;
        for (const inp of document.querySelectorAll('input')) {
            const ph = (inp.placeholder || '').toLowerCase();
            if (inp.offsetParent !== null &&
                inp.getBoundingClientRect().top > 300 &&
                !ph.includes('display')) {
                input = inp;
                break;
            }
        }
        if (!input) return false;

        // Walk up to the container holding "Quick check"
        let box = input.parentElement;
        let text = '';
        while (box && box !== document.body) {
            if ((box.textContent || '').includes('Quick check')) {
                text = box.textContent;
                break;
            }
            box = box.parentElement;
        }
        if (!box || !text) return false;

        const m = text.match(/(-?\d+)\s*([+\-*/–—×÷x])\s*(-?\d+)/);
        if (!m) return false;

        const a = parseInt(m[1], 10);
        const b = parseInt(m[3], 10);
        let result;
        switch (m[2]) {
            case '+': result = a + b; break;
            case '-': case '–': case '—': result = a - b; break;
            case '*': case '×': case 'x': result = a * b; break;
            case '/': case '÷': result = a / b; break;
            default: return false;
        }

        lastCaptchaTime = Date.now();

        if (input.value !== String(result)) {
            console.log(`[AutoGrinder] Captcha: ${a} ${m[2]} ${b} = ${result}`);
            input.focus();
            setReactInputValue(input, result);
        }

        setTimeout(() => {
            // Submit with Enter
            ['keydown', 'keypress', 'keyup'].forEach(type =>
                input.dispatchEvent(new KeyboardEvent(type, {
                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
                    bubbles: true, cancelable: true
                }))
            );

            // Fallback: click the Verify button
            for (const el of box.querySelectorAll('*')) {
                if (el.textContent && el.textContent.trim().includes('Verify') &&
                    (el.tagName === 'BUTTON' ||
                     el.getAttribute('role') === 'button' ||
                     el.classList.toString().includes('btn') ||
                     el.style.cursor === 'pointer' ||
                     el.children.length <= 2)) {
                    fireClick(el);
                    break;
                }
            }
        }, 150);

        return true;
    }

    function clickByText(startsWith) {
        for (const el of document.querySelectorAll('div, button')) {
            if (el.offsetParent !== null &&
                !el.contains(panel) &&
                el.textContent.trim().startsWith(startsWith)) {
                return fireClick(el);
            }
        }
        return false;
    }

    function tick() {
        if (solveCaptchaIfNeeded()) return;
        clickByText(MAIN_BUTTON_TEXT);
        clickByText(BOOST_TEXT);
    }

    // ---------- Controls ----------
    button.addEventListener('click', () => {
        isRunning = !isRunning;
        if (isRunning) {
            intervalId = setInterval(tick, INTERVAL_MS);
        } else {
            clearInterval(intervalId);
            intervalId = null;
        }
        renderUI();
    });
})();
