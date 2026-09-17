const canvas = document.getElementById("viewport");
const scoreText = document.getElementById("score_text");
const highscoreText = document.getElementById("highscore_text");
const gameOverScreen = document.getElementById("gameover_screen");
const webcamContainer = document.getElementById("webcam-container");
const labelContainer = document.getElementById("label-container");
const enableWebcamInput = document.getElementById("webcam_enable");

const context = canvas.getContext('2d');

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Size {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}

class Grid {
    constructor(size, cellSize) {
        this.size = size;
        this.cellSize = cellSize;
    }
}

class InputAction {
    
    constructor (initialValue, pressHandler = null, releaseHandler = null) {
        this._pressHandler = pressHandler;
        this._releaseHandler = releaseHandler;
        this._value = initialValue;
    }

    handlePress(key) {
        if (this._pressHandler)
            this._value = this._pressHandler(key)
    }

    handleRelease(key) {
        if (this._releaseHandler)
            this._releaseHandler(key);
    }

    get value() {
        return this._value;
    }
}

class InputDevice {
    static Keyboard = 'keyboard';
    static Webcam = 'webcam';
}

class Events {
    static Keydown = 'keydown';
    static Keyup = 'keyup';
    static Hitpose = 'hitpose';
}

class InputManager {
    _inputDevice = null;
    _inputMap = {};

    _inputInHandler = null;
    _inputOutHandler = null;

    constructor(device = InputDevice.Keyboard) {
        this._inputDevice = device;
        this._inputMap = {
            move: this._moveAction(),
            restart: new InputAction(
                false,
                (key) => {
                    return key === 'r';
                },
                (key) => false
            )
        };
    }

    enable() {
        if (!this._inputInHandler) {
            this._inputInHandler = this._inputDevice === InputDevice.Keyboard
                ? this._input_inKeyboardHandler()
                : this._input_inWebcamHandler();

            const inputInEvent = this._inputDevice === InputDevice.Keyboard ? Events.Keydown : Events.Hitpose;

            document.body.addEventListener(inputInEvent, this._inputInHandler);
        }

        if (!this._inputOutHandler && this._inputDevice === InputDevice.Keyboard) {
            this._inputOutHandler = this._input_outKeyboardHandler();

            document.body.addEventListener(Events.Keyup, this._inputOutHandler);
        }
    }

    disable() {
        if (this._inputInHandler) {
            const inputInEvent = this._inputDevice === InputDevice.Keyboard ? Events.Keydown : Events.Hitpose;

            document.body.removeEventListener(inputInEvent, this._inputInHandler);
        }

        if (this._inputOutHandler)
            document.body.removeEventListener(Events.Keyup, this._inputOutHandler);

        this._inputInHandler = null;
        this._inputOutHandler = null;
    }

    switchDevice(device) {
        this.disable();

        this._inputDevice = device;
        this._inputMap.move = this._moveAction();
        
        this.enable();
    }

    _moveAction() {
        return this._inputDevice === InputDevice.Keyboard
            ? this._move_fromKeyboard()
            : this._move_fromWebcam();
    }

    _move_fromKeyboard() {
        const leftKeys = ['a', 'ArrowLeft'];
        const rightKeys = ['d', 'ArrowRight'];
        const downKeys = ['s', 'ArrowDown'];
        const upKeys = ['w', 'ArrowUp'];

        return new InputAction(
            new Vector2(0, 0),
            (key) => {
                let value = new Vector2(0, 0);

                if (leftKeys.includes(key)) {
                    value.x = -1;
                } else if (rightKeys.includes(key)) {
                    value.x = 1;
                } else if (downKeys.includes(key)) {
                    value.y = 1;
                } else if (upKeys.includes(key)) {
                    value.y = -1;
                }

                return value;
            },
            function (key) {
                let value = this.value;

                if (leftKeys.includes(key)) {
                    value.x = 0;
                } else if (rightKeys.includes(key)) {
                    value.x = 0;
                } else if (downKeys.includes(key)) {
                    value.y = 0;
                } else if (upKeys.includes(key)) {
                    value.y = 0;
                }

                return value;
            }
        );
    }

    _move_fromWebcam() {
        const leftPose = 'Left';
        const rightPose = 'Right';
        const upPose = 'Up';
        const downPose = 'Down';

        return new InputAction(
            new Vector2(0, 0),
            pose => {
                let value = new Vector2(0, 0);
                
                switch (pose) {
                    case leftPose:
                        value.x = -1;
                        break;
                    case rightPose:
                        value.x = 1;
                        break;
                    case upPose:
                        value.y = -1;
                        break;
                    case downPose:
                        value.y = 1;
                        break;
                }

                return value;
            }
        )
    }

    _input_inKeyboardHandler() {
        return (ev) => {
            Object.keys(this._inputMap).map(action => {
                this._inputMap[action].handlePress(ev.key);
            })
        };
    }

    _input_outKeyboardHandler() {
        return (ev) => {
            Object.keys(this._inputMap).map(action => {
                this._inputMap[action].handleRelease(ev.key);
            })
        };
    }

    _input_inWebcamHandler() {
        return (ev) => {
            Object.keys(this._inputMap).map(action => {
                this._inputMap[action].handlePress(ev.detail.pose);
            })
        }
    }

    get actions() {
        return this._inputMap;
    }

    get source() {
        return this._inputDevice;
    }
}

class GameObject {
    constructor(size, context) {
        this.position = new Vector2(0, 0);
        this.size = size;
        this._context = context;
    }

    draw() {}
}

class Food extends GameObject {
    constructor(size, context) {
        super(size, context);
    }

    draw() {
        this._context.fillStyle = 'red';
        this._context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
    }
}

class Snake extends GameObject {
    constructor(size, context) {
        super(size, context);

        this._oldPosition = null;
        this._nextPiece = null;
        this._previousPiece = null;
    }

    connect(piece) {
        this._nextPiece = piece;
    }

    increase() {
        const lastPiece = this.tail;
        const tail = new Snake(this.size, this._context);
        tail.position = lastPiece._oldPosition;

        lastPiece.connect(tail);
    }

    reset() {
        this._nextPiece = null;
    }

    moveTo(position) {
        this._oldPosition = this.position;

        if (this._nextPiece) {
            this._nextPiece.moveTo(this._oldPosition);
        }
        
        this.position = position;
    }

    draw() {
        this._context.fillStyle = 'green';
        this._context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);

        if (this._nextPiece) {
            this._nextPiece.draw();
        }
    }

    hasEatenFood(food) {
        if (this.head === this) {
            if (food.position.x >= this.position.x
                && food.position.x + (food.size.width / 2) <= this.position.x + this.size.width
                && food.position.y >= this.position.y
                && food.position.y + (food.size.height / 2) <= this.position.y + this.size.height) {
                return true;
            }
        }

        return false;
    }

    hasCollidedWithSelf() {
        if (this.head === this) {
            let currentPiece = this._nextPiece;

            while (currentPiece) {
                if (this.position.x === currentPiece.position.x
                    && this.position.y === currentPiece.position.y) {
                    return true;
                }

                currentPiece = currentPiece._nextPiece;
            }

            return false;
        }
    }

    get coordinates() {
        const allCoordinates = [
            this.position
        ];

        let currentPiece = this;

        while (currentPiece._nextPiece !== null) {
            currentPiece = currentPiece._nextPiece;

            allCoordinates.push(currentPiece.position);
        }

        return allCoordinates;
    }

    get next() {
        return this._nextPiece;
    }

    get previous() {
        return this._previousPiece;
    }

    get tail() {
        let tail = this;
        
        while (tail._nextPiece !== null) {
            tail = tail._nextPiece;
        }

        return tail;
    }

    get head() {
        let head = this;

        while (head._previousPiece !== null) {
            head = head._previousPiece;
        }
        
        return head;
    }

    get length() {
        let count = 1;
        let tail  = this;

        while (tail._nextPiece !== null) {
            tail = tail._nextPiece;

            count++;
        }

        return count;
    }
}

class SpawnManager {
    snake = null;
    food = null;
    
    constructor(grid, context) {
        this._context    = context;
        this._grid = grid;
    }

    spawnSnake(size) {
        if (!this.snake)
            this.snake = new Snake(size, this._context);
        else
            this.snake.reset();

        this.snake.position.x = this._grid.size.width / 2;
        this.snake.position.y = this._grid.size.height / 2;

        return this.snake;
    }

    spawnFood(size) {
        if (!this.food)
            this.food = new Food(size, this._context);

        const randomFreeCoordinates = this._getRandomFreeCoordinates();

        const originPointX = size.width / 2;
        const originPointY = size.height / 2;

        this.food.position.x = randomFreeCoordinates.x + originPointX;
        this.food.position.y = randomFreeCoordinates.y + originPointY;

        return this.food;
    }

    _getRandomFreeCoordinates() {
        const notFreeCoordinates = this.snake.coordinates;
        const freeCoordinates = [];

        const notFreeCoordinatesMap = notFreeCoordinates.map(c => ({ [`${c.x}x${c.y}`] : c }))
            .reduce((obj, curr) => ({ ...obj, ...curr }), []);
        
        for (let x = 0; x < this._grid.size.width; x += this._grid.cellSize.width) {
            for (let y = 0; y < this._grid.size.height; y += this._grid.cellSize.height) {
                if (!notFreeCoordinatesMap[`${x}x${y}`])
                    freeCoordinates.push(new Vector2(x, y));
            }
        }

        const randomIndex = Math.floor(Math.random() * freeCoordinates.length);
        const randomCoordinates = freeCoordinates[randomIndex];
    
        return randomCoordinates;
    }
}


// Model settings

const URL = "../model/";
const CLASS_PROB_THRESHOLD = 0.6;

let model;
let webcam;
let maxPredictions; 

// Game settings

const highscoreKey = 'snakeML_';

const GRID_SIZE = new Size(640, 512);
const CELL_SIZE = new Size(32, 32);

const halfCellSize = CELL_SIZE.width / 2;
const FOOD_SIZE = new Size(halfCellSize,  halfCellSize);

let lastTime;
let lastDir;
let lastPose;
let moveInterval;
let speed;
let direction;
let moveAction;
let restartAction;
let score;
let highscore;
let snake;
let food;
let isGameOver;

let inputManager = new InputManager();
let spawnManager = new SpawnManager(
    new Grid(
        GRID_SIZE,
        CELL_SIZE
    ),
    context
);

async function start() {
    _initValues();
    await _setupModel();
    _handleEnableWebcam();

    inputManager.enable();
    window.requestAnimationFrame(step.bind(this));
}

async function step(timestamp) {
    _clearCanvas();
    _updateWebcam();

    if (!lastTime) {
        lastTime = timestamp;
    }

    if (!isGameOver) {
        if (timestamp - lastTime >= moveInterval) {
            lastTime = timestamp;

            _handleMovement();
            _handleFoodCollision();
            _handleGameOver();
        }

        _drawObjects();
    } else {
        _handleGameRestart();
    }

    await _predict();

    window.requestAnimationFrame(step.bind(this));
}

function _initValues() {
    lastTime = 0;
    lastDir = new Vector2(0, 0);
    moveInterval = 200;
    speed = 32;
    score = 0;
    direction = new Vector2(0, 0);
    isGameOver = false;
    highscore = _loadHighscore();

    moveAction = inputManager.actions.move;
    restartAction = inputManager.actions.restart;

    snake = spawnManager.spawnSnake(CELL_SIZE);
    food = spawnManager.spawnFood(FOOD_SIZE);

    _updateScore(0);
}

function _handleEnableWebcam () {
    enableWebcamInput.addEventListener('change', async (e) => {
        const isEnable = e.target.checked;

        inputManager.switchDevice(isEnable ? InputDevice.Webcam : InputDevice.Keyboard);
        moveAction = inputManager.actions.move;

        if (isEnable) {
            webcamContainer.classList.remove('d-none');
            labelContainer.classList.remove('d-none');

            await _initWebcam();
        } else {
            webcamContainer.classList.add('d-none');
            labelContainer.classList.add('d-none');

            _disposeWebcam();
        }
    });
}

function _clearCanvas() {
    context.clearRect(0, 0, GRID_SIZE.width, GRID_SIZE.height);
}

function _handleMovement() {
    if ((moveAction.value.x !== 0 || moveAction.value.y !== 0)) {
        direction = new Vector2(moveAction.value.x, moveAction.value.y);
    }

    if (snake.length > 1) {            
        if (lastDir.x !== 0 && Math.abs(direction.x - lastDir.x) > 0) {
            direction.x *= -1;
        }
        
        if (lastDir.y !== 0 && Math.abs(direction.y - lastDir.y) > 0) {
            direction.y *= -1;
        }
    }

    let newX = snake.position.x + (direction.x * speed);
    let newY = snake.position.y + (direction.y * speed);

    if (newX > GRID_SIZE.width) {
        newX = 0;
    } else if (newX < 0) {
        newX = GRID_SIZE.width;
    }

    if (newY > GRID_SIZE.height) {
        newY = 0;
    } else if (newY < 0) {
        newY = GRID_SIZE.height;
    }

    snake.moveTo(new Vector2(newX, newY));

    lastDir = direction;
}

function _handleGameOver() {
    if (_checkGameOver()) {
        isGameOver = true;

        _saveHighscore();
        _showGameOverScreen();
    }
}

function _handleFoodCollision() {
    if (snake.hasEatenFood(food)) {
        spawnManager.spawnFood(FOOD_SIZE);
        snake.increase();
        _updateScore(1);
    }
}

function _checkGameOver() {
    return snake.hasCollidedWithSelf();
}

function _showGameOverScreen() {
    gameOverScreen.classList.remove('d-none');
}

function _hideGameOverScreen() {
    gameOverScreen.classList.add('d-none');
}

function _drawObjects() {
    snake.draw();
    food.draw();
}

function _updateScore(value) {
    score += value;

    if (score > highscore) {
        highscore = score;
    }

    scoreText.innerText = `Score: ${score}`;
    highscoreText.innerText = `Highscore: ${highscore}`;
}

function _loadHighscore() {
    const highscore = window.localStorage.getItem(highscoreKey);
    
    return highscore ? Number(highscore) : 0;
}

function _saveHighscore() {
    window.localStorage.setItem(highscoreKey, highscore.toString());
}

function _handleGameRestart() {
    if (restartAction.value) {
        _restartGame();
    }
}

function _restartGame() {
    _hideGameOverScreen();
    _initValues();
}

async function _setupModel() {
    await _loadModel();
    _createDOMElements();
}

async function _loadModel() {
    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // or files from your local hard drive
    // Note: the pose library adds "tmImage" object to your window (window.tmImage)
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
}

async function _initWebcam() {
    const size = 200;
    const flip = true; // whether to flip the webcam
    webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
    
    await webcam.setup(); // request access to the webcam
    await webcam.play();

    webcamContainer.appendChild(webcam.canvas);
}

function _disposeWebcam() {
    webcamContainer.removeChild(webcam.canvas);

    webcam.stop();
    webcam = null;
}

function _createDOMElements() {
    // append elements to the DOM
    
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        labelContainer.appendChild(document.createElement("div"));
    }
}

function _updateWebcam() {
    if (!webcam) return;

    webcam.update();
}

async function _predict() {
    if (!webcam || !webcam.canvas) return;

    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }

    const sortedPrediction = [...prediction].sort((a, b) => b.probability - a.probability);
    const probInput = sortedPrediction[0];

    if (probInput.probability >= CLASS_PROB_THRESHOLD) {
        if (probInput.className !== lastPose) { 
            _dispatchPoseEvent(probInput.className);
        }

        lastPose = probInput.className;
    }
}

function _dispatchPoseEvent(pose) {
    const event = new CustomEvent(Events.Hitpose, {
        detail: { pose }
    });

    document.body.dispatchEvent(event);
}

start();