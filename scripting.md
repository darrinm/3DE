## Scripting

'this' references the object the script is attached to.

Script is first called with the (invisible) arguments:
```javascript
(player: Player, renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera)
```

Player { dom, width, height }

Scripts have access to all browser globals including THREE.

this.getObjectByName(name)

```javascript
events = {
    init: Player.load arguments (json? e.g. json.project.vr)
    start: Player.play arguments
    stop: Player.stop arguments
    keydown: { charCode, keyCode, ctrlKey, shiftKey, altKey, metaKey, preventDefault() }
    keyup: { charCode, keyCode, ctrlKey, shiftKey, altKey, metaKey, preventDefault() }
    mousedown: { screenX, screenY, clientX, clientY, button, buttons, ctrlKey, shiftKey, altKey, metaKey, preventDefault() }
    mouseup: { screenX, screenY, clientX, clientY, button, buttons, ctrlKey, shiftKey, altKey, metaKey, preventDefault() }
    mousemove: { screenX, screenY, clientX, clientY, button, buttons, ctrlKey, shiftKey, altKey, metaKey, preventDefault() }
    touchstart: { touches, targetTouches, changedTouches, ctrlKey, shiftKey, altKey, metaKey }
    touchend: { touches, targetTouches, changedTouches, ctrlKey, shiftKey, altKey, metaKey }
    touchmove: { touches, targetTouches, changedTouches, ctrlKey, shiftKey, altKey, metaKey }
    update: { time: time, delta: time - prevTime }
}
```
