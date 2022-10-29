module.exports = function pong() {
	"use strict";
	const flags = require("./flags")();
	const { Terminal, Box, Menu } = require("command-line-draw");
	console = require("./colorConsole");

	const random = (min, max) => Math.random() * (max - min) + min;
	const randomSlope = (min, max) => Math.tan(random(Math.atan(min), Math.atan(max)));
	function directionFunc(n, direction) {
		const min = 0;
		const max = terminal.width - ball.width;
		if (Math.abs(n) === Infinity) {
			if (direction === "right") return max;
			else return min;
		}
		else return Math.min(Math.max(n, min), max);
	}
	function nextPoint(slope, direction) {
		const directionMod = direction === "right" ? 1 : -1;
		const ballYInt = -slope * ball.x + ball.y;
		const x = directionFunc(directionMod * slope < 0 ? -ballYInt / slope : (terminal.height - ball.height - ballYInt) / slope, direction);
		const y = ball.yRounder(slope * x + ballYInt);
		if (automatePlayer2) {
			if (x > paddleX + paddleWidth) leftPaddle.moveTo(paddleX, Math.min(Math.max(y + 1 - paddleHeight / 2, 0), terminal.height - paddleHeight));
			else leftPaddle.moveTo(paddleX, ball.yRounder(Math.min(Math.max(slope * (paddleX + paddleWidth) + ballYInt + 1 - paddleHeight / 2, 0), terminal.height - paddleHeight)));
		}
		return [ball.xRounder(x), y];
	}
	const writeScore = (score, location) => terminal.sevenSegment(location === "right" ? rightScoreX : leftScoreX, 1, ...Terminal.sevenSegmentPresets.numbers[score]);

	const terminal = new Terminal({
		width: flags.w || flags.width || 110,
		height: flags.h || flags.height || 30,
		border: "solid",
		dev: flags.d || flags.dev,
		color: {
			foreground: "white",
			background: "black"
		}
	});

	const centerX = terminal.width / 2;
	const centerY = terminal.height / 2;
	const paddleHeight = 8;
	const paddleWidth = 2;
	const paddleX = 7;
	const leftScoreX = Math.floor(terminal.width / 4 - 3);
	const rightScoreX = Math.ceil(3 * terminal.width / 4 - 3);
	const borders = Terminal.BORDERS.double;
	borders.horizontalDown = "\u2566";
	borders.horizontalUp = "\u2569";
	let cpuScore, playerScore, ballDirection, ballSlope, bouncedOff, automatePlayer2;

	const drawCenterLine = () => terminal.drawLine(centerX, 0, centerX, terminal.height, null, 2, true, 0.5);

	const leftPaddle = new Box(paddleWidth, paddleHeight);
	const rightPaddle = new Box(paddleWidth, paddleHeight, { speed: 30 });
	const ball = new Box(2, 1, { speed: 30 });

	terminal.addSprite(leftPaddle);
	terminal.addSprite(rightPaddle);
	terminal.addSprite(ball);

	function reset() {
		// paddles
		leftPaddle.stop();
		rightPaddle.stop();
		leftPaddle.draw(paddleX, centerY - paddleHeight / 2);
		rightPaddle.draw(terminal.width - paddleX - paddleWidth, centerY - paddleHeight / 2);

		// ball
		bouncedOff = undefined;
		ballSlope = randomSlope(-0.5, 0.5);
		ball.speed = 30;
		ball.clear();
		setTimeout(() => {
			ball.draw(centerX - 1, centerY);
			bounce();
		}, 200);
	}
	function bounce() {
		ball.moveTo(...nextPoint(ballSlope, ballDirection));
	}
	function onresize() {
		drawCenterLine();
		writeScore(cpuScore, "left");
		writeScore(playerScore, "right");
	}

	function init() {
		cpuScore = 0;
		playerScore = 0;
		ballDirection = Math.round(Math.random()) ? "left" : "right";

		ball.removeAllListeners();
		terminal.removeAllListeners();
		terminal.clear();
		terminal.color.foreground = "white";
		
		terminal.on("up", () => {
			rightPaddle.moveTo(rightPaddle.x, Math.max(rightPaddle.y - 1, 0));
		});
		terminal.on("down", () => {
			rightPaddle.moveTo(rightPaddle.x, Math.min(rightPaddle.y + 1, terminal.height - rightPaddle.height));
		});
		terminal.on("resize", onresize);

		ball.on("clear", (x, y) => {
			if (x <= centerX && x >= centerX - 2) drawCenterLine();
			else if (!(y + ball.height < 1 || y > 6)) {
				if (!(x + ball.width < leftScoreX || x >= leftScoreX + 6)) writeScore(cpuScore, "left");
				else if (!(x + ball.width < rightScoreX || x >= rightScoreX + 6)) writeScore(playerScore, "right");
			}
		});
		ball.on("frame", () => {
			const touching = ball.touching(rightPaddle) ? rightPaddle : ball.touching(leftPaddle) ? leftPaddle : null;
			if (touching) {
				touching.draw();
				if (bouncedOff !== touching) {
					if (playerScore !== 3) ball.stop();
					let x;
					if (touching === rightPaddle) {
						x = terminal.width - paddleX - 1;
						ballDirection = "left";
					}
					else {
						x = paddleX + 1;
						ballDirection = "right";
					}
					ballSlope = ((rightPaddle.y + paddleHeight / 2) - (ball.y + 0.5)) / ((terminal.width - paddleX) - Math.min(ball.x + 1, x)) / 1.5 + (Math.random() - 0.5) / 5;
					ball.speed += 10;
					bouncedOff = touching;
					bounce();
				}
			}
		});
		ball.on("moveEnded", () => {
			const playerScored = ball.x === 0;
			const cpuScored = ball.x === terminal.width - ball.width;
			if (playerScored || cpuScored) {
				let score;
				if (playerScored) score = ++playerScore;
				else if (cpuScored) score = ++cpuScore;

				if (playerScore === 2) {
					terminal.color.foreground = "blue";
				} else if (cpuScore === 2) {
					terminal.color.foreground = "red";
				}

				if (score === 3) {
					let x = playerScored ? terminal.width / 2 - 29 : terminal.width / 2 - 29;
					const y = terminal.height / 2 - 2.5;
					terminal.removeAllListeners();
					terminal.clear();
					terminal.writeLarge(playerScored ? "You Win!" : "You Lose", x, y);
					if (playerScored) {
						terminal.color.foreground = "blue";
						terminal.write("flag: correcthorsebatterystaple" , terminal.width / 2 - 5.5, terminal.height / 2 + 3.5);
					} else {
						terminal.color.foreground = "red";
						terminal.write("Press R to restart, Q to quit", terminal.width / 2 - 15.5, terminal.height / 2 + 3.5);
					}
					if (cpuScored) {
						terminal.once("r", init);
						terminal.on("q", () => process.exit());
					}
				}

				else {
					ballDirection = playerScored ? "left" : "right";
					writeScore(score, playerScored ? "right" : "left");
					reset();
				}
			}
			else if (ball.y === 0 || ball.y === terminal.height - 1) {
				ballSlope *= -1;
				bounce();
			}
		});

		reset();
		onresize();
	}
	
	leftPaddle.speed = 20;
	automatePlayer2 = true;
	init();
};
