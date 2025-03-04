// Supabase configuration - Replace with your actual values
const SUPABASE_URL = 'https://lshtjaeevgqqffoehkwq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzaHRqYWVldmdxcWZmb2Voa3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMDYyNTgsImV4cCI6MjA1NjY4MjI1OH0.XJybzljxDLkPYyEHX1PnWfGCixKKsWgqXdnXNDVjnGw';
let supabaseClient = null;

// Try to initialize Supabase client
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Supabase client initialized');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

// Tetris Game Variables
let grid = [];
let currentPiece;
let nextPiece;
let gameState = 'playing';
let score = 0;
let level = 1;
let linesCleared = 0;
let fallSpeed = 1000; // milliseconds between automatic drops
let lastFallTime = 0;
let highScores = [];
let playerName = '';
let nameInput;
let leaderboardDiv;

// Grid dimensions
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Tetromino shapes and colors
const SHAPES = [
  [[1, 1, 1, 1]], // I
  [[1, 1, 1], [0, 1, 0]], // T
  [[1, 1, 1], [1, 0, 0]], // L
  [[1, 1, 1], [0, 0, 1]], // J
  [[1, 1], [1, 1]], // O
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]] // Z
];

const COLORS = [
  '#00FFFF', // cyan - I
  '#800080', // purple - T
  '#FFA500', // orange - L
  '#0000FF', // blue - J
  '#FFFF00', // yellow - O
  '#00FF00', // green - S
  '#FF0000'  // red - Z
];

function setup() {
  createCanvas(COLS * BLOCK_SIZE + 200, ROWS * BLOCK_SIZE);
  
  // Initialize the grid
  resetGrid();
  
  // Create the first piece
  currentPiece = createPiece();
  nextPiece = createPiece();
  
  // Set text properties
  textAlign(CENTER, CENTER);
  textSize(20);
  
  // Get DOM elements
  nameInput = document.getElementById('nameInput');
  leaderboardDiv = document.getElementById('leaderboard');
  
  // Add event listeners
  if (nameInput) {
    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        submitScore();
      }
    });
  }
  
  const closeButton = document.getElementById('closeLeaderboard');
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      hideLeaderboard();
    });
  }
  
  // Initialize high scores with dummy data
  highScores = [
    { player_name: "Player 1", score: 5000, level: 5 },
    { player_name: "Player 2", score: 4000, level: 4 },
    { player_name: "Player 3", score: 3000, level: 3 }
  ];
  
  // Fetch high scores from Supabase
  fetchHighScores();
}

function draw() {
  background(40);
  
  if (gameState === 'playing') {
    // Draw the game grid
    drawGrid();
    
    // Draw the current piece
    drawPiece(currentPiece);
    
    // Draw the next piece preview
    drawNextPiece();
    
    // Draw score and level
    drawStats();
    
    // Handle automatic falling
    if (millis() - lastFallTime > fallSpeed) {
      moveDown();
      lastFallTime = millis();
    }
  } else if (gameState === 'paused') {
    // Draw the paused screen
    drawGrid();
    drawPiece(currentPiece);
    drawNextPiece();
    drawStats();
    
    // Draw pause overlay
    fill(0, 0, 0, 150);
    rect(0, 0, width, height);
    
    fill(255);
    textSize(40);
    text('PAUSED', width/2, height/2);
    textSize(20);
    text('Press P to resume', width/2, height/2 + 40);
  } else if (gameState === 'gameOver') {
    // Draw game over screen
    drawGrid();
    fill(255);
    textSize(40);
    text('GAME OVER', width/2, height/2 - 40);
    textSize(20);
    text('Score: ' + score, width/2, height/2);
    text('Press ENTER to restart', width/2, height/2 + 40);
    text('Press H to view high scores', width/2, height/2 + 70);
    
    // Show name input if score is high enough
    if (isHighScore(score) && nameInput && nameInput.style.display !== 'block') {
      showNameInput();
    }
  }
}

function resetGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = 0; // 0 means empty
    }
  }
}

function createPiece() {
  const randomIndex = floor(random(SHAPES.length));
  return {
    shape: SHAPES[randomIndex].map(row => [...row]), // Create a deep copy
    color: COLORS[randomIndex],
    row: 0,
    col: floor(COLS / 2) - floor(SHAPES[randomIndex][0].length / 2),
    index: randomIndex
  };
}

function drawGrid() {
  // Draw the border
  stroke(80);
  strokeWeight(2);
  fill(0);
  rect(0, 0, COLS * BLOCK_SIZE, ROWS * BLOCK_SIZE);
  
  // Draw the grid cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c]) {
        fill(COLORS[grid[r][c] - 1]);
        rect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
  
  // Draw grid lines
  strokeWeight(0.5);
  stroke(60);
  for (let r = 0; r <= ROWS; r++) {
    line(0, r * BLOCK_SIZE, COLS * BLOCK_SIZE, r * BLOCK_SIZE);
  }
  for (let c = 0; c <= COLS; c++) {
    line(c * BLOCK_SIZE, 0, c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
  }
}

function drawPiece(piece) {
  fill(piece.color);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        rect((piece.col + c) * BLOCK_SIZE, (piece.row + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

function drawNextPiece() {
  // Draw next piece panel
  fill(0);
  stroke(80);
  rect(COLS * BLOCK_SIZE + 10, 10, 180, 100);
  
  // Draw the next piece
  fill(nextPiece.color);
  for (let r = 0; r < nextPiece.shape.length; r++) {
    for (let c = 0; c < nextPiece.shape[r].length; c++) {
      if (nextPiece.shape[r][c]) {
        rect(COLS * BLOCK_SIZE + 60 + c * BLOCK_SIZE, 40 + r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
  
  // Label
  fill(255);
  noStroke();
  text('NEXT', COLS * BLOCK_SIZE + 100, 20);
}

function drawStats() {
  // Draw stats panel
  fill(0);
  stroke(80);
  rect(COLS * BLOCK_SIZE + 10, 120, 180, 150);
  
  // Draw stats
  fill(255);
  noStroke();
  text('SCORE', COLS * BLOCK_SIZE + 100, 140);
  text(score, COLS * BLOCK_SIZE + 100, 170);
  
  text('LEVEL', COLS * BLOCK_SIZE + 100, 200);
  text(level, COLS * BLOCK_SIZE + 100, 230);
  
  // Controls
  fill(0);
  stroke(80);
  rect(COLS * BLOCK_SIZE + 10, 280, 180, 200);
  
  fill(255);
  noStroke();
  text('CONTROLS', COLS * BLOCK_SIZE + 100, 300);
  textAlign(LEFT);
  text('← → : Move', COLS * BLOCK_SIZE + 20, 330);
  text('↑ : Rotate', COLS * BLOCK_SIZE + 20, 360);
  text('↓ : Soft Drop', COLS * BLOCK_SIZE + 20, 390);
  text('SPACE : Hard Drop', COLS * BLOCK_SIZE + 20, 420);
  text('P : Pause', COLS * BLOCK_SIZE + 20, 450);
  textAlign(CENTER);
}

function keyPressed() {
  if (gameState === 'playing') {
    if (keyCode === LEFT_ARROW) {
      moveLeft();
    } else if (keyCode === RIGHT_ARROW) {
      moveRight();
    } else if (keyCode === DOWN_ARROW) {
      moveDown();
      // Award points for manually dropping
      score += 1;
    } else if (keyCode === UP_ARROW) {
      rotateFixed();
    } else if (keyCode === 32) { // SPACE
      hardDrop();
    } else if (key === 'p' || key === 'P') {
      // Pause the game
      gameState = 'paused';
    } else if (key === 'h' || key === 'H') {
      // Show high scores
      showLeaderboard();
    }
  } else if (gameState === 'paused') {
    if (key === 'p' || key === 'P') {
      // Unpause the game
      gameState = 'playing';
    } else if (key === 'h' || key === 'H') {
      // Show high scores
      showLeaderboard();
    }
  } else if (gameState === 'gameOver') {
    if (keyCode === ENTER) {
      // Restart the game
      resetGrid();
      currentPiece = createPiece();
      nextPiece = createPiece();
      score = 0;
      level = 1;
      linesCleared = 0;
      fallSpeed = 1000;
      gameState = 'playing';
      if (nameInput) hideNameInput();
      hideLeaderboard();
    } else if (key === 'h' || key === 'H') {
      // Show high scores
      showLeaderboard();
    }
  }
}

function moveLeft() {
  currentPiece.col--;
  if (isCollision()) {
    currentPiece.col++;
  }
}

function moveRight() {
  currentPiece.col++;
  if (isCollision()) {
    currentPiece.col--;
  }
}

function moveDown() {
  currentPiece.row++;
  if (isCollision()) {
    currentPiece.row--;
    placePiece();
    clearLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    
    // Check for game over
    if (isCollision()) {
      gameState = 'gameOver';
    }
  }
  lastFallTime = millis();
}

function hardDrop() {
  let dropDistance = 0;
  while (!isCollision()) {
    currentPiece.row++;
    dropDistance++;
  }
  currentPiece.row--;
  dropDistance--;
  
  // Award points for hard drop
  score += dropDistance * 2;
  
  placePiece();
  clearLines();
  currentPiece = nextPiece;
  nextPiece = createPiece();
  
  // Check for game over
  if (isCollision()) {
    gameState = 'gameOver';
  }
}

// Fixed rotation function
function rotateFixed() {
  // Store the original piece state
  const originalRow = currentPiece.row;
  const originalCol = currentPiece.col;
  const originalShape = [];
  
  // Create a deep copy of the original shape
  for (let r = 0; r < currentPiece.shape.length; r++) {
    originalShape[r] = [...currentPiece.shape[r]];
  }
  
  // Special case for O piece (doesn't rotate)
  if (currentPiece.index === 4) {
    return;
  }
  
  // Get dimensions
  const numRows = currentPiece.shape.length;
  const numCols = currentPiece.shape[0].length;
  
  // Create a new rotated shape
  let rotated = [];
  for (let i = 0; i < numCols; i++) {
    rotated[i] = [];
    for (let j = 0; j < numRows; j++) {
      rotated[i][j] = currentPiece.shape[numRows - 1 - j][i];
    }
  }
  
  // Apply the rotation
  currentPiece.shape = rotated;
  
  // Check for collisions and adjust position if necessary
  if (isCollision()) {
    // Try moving left
    currentPiece.col--;
    if (isCollision()) {
      // Try moving right (from original position)
      currentPiece.col += 2;
      if (isCollision()) {
        // Try moving up
        currentPiece.col--;
        currentPiece.row--;
        if (isCollision()) {
          // If all adjustments fail, revert to original state
          currentPiece.row = originalRow;
          currentPiece.col = originalCol;
          currentPiece.shape = originalShape;
        }
      }
    }
  }
}

function isCollision() {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        const newRow = currentPiece.row + r;
        const newCol = currentPiece.col + c;
        
        // Check boundaries
        if (newCol < 0 || newCol >= COLS || newRow >= ROWS) {
          return true;
        }
        
        // Check if the position is already filled
        if (newRow >= 0 && grid[newRow][newCol]) {
          return true;
        }
      }
    }
  }
  return false;
}

function placePiece() {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        const newRow = currentPiece.row + r;
        const newCol = currentPiece.col + c;
        
        // Only place if within the grid
        if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS) {
          grid[newRow][newCol] = currentPiece.index + 1; // +1 because 0 means empty
        }
      }
    }
  }
}

function clearLines() {
  let linesCleared = 0;
  
  for (let r = ROWS - 1; r >= 0; r--) {
    let isLineFull = true;
    
    for (let c = 0; c < COLS; c++) {
      if (!grid[r][c]) {
        isLineFull = false;
        break;
      }
    }
    
    if (isLineFull) {
      // Clear the line
      for (let rr = r; rr > 0; rr--) {
        for (let c = 0; c < COLS; c++) {
          grid[rr][c] = grid[rr-1][c];
        }
      }
      
      // Clear the top line
      for (let c = 0; c < COLS; c++) {
        grid[0][c] = 0;
      }
      
      // Move the row counter back to recheck the current row
      r++;
      linesCleared++;
    }
  }
  
  // Update score based on lines cleared
  if (linesCleared > 0) {
    // Classic Tetris scoring
    switch (linesCleared) {
      case 1:
        score += 100 * level;
        break;
      case 2:
        score += 300 * level;
        break;
      case 3:
        score += 500 * level;
        break;
      case 4:
        score += 800 * level; // Tetris!
        break;
    }
    
    // Update total lines cleared
    this.linesCleared += linesCleared;
    
    // Update level and speed
    level = floor(this.linesCleared / 10) + 1;
    fallSpeed = max(100, 1000 - (level - 1) * 100); // Speed up as level increases
  }
}

// High score functions with Supabase integration
async function fetchHighScores() {
  if (!supabaseClient) {
    console.log('Supabase client not available, using local high scores');
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      highScores = data;
      console.log('High scores fetched:', highScores);
    }
  } catch (error) {
    console.error('Error fetching high scores:', error);
  }
}

async function submitScore() {
  if (nameInput) {
    playerName = nameInput.value.trim();
    
    if (playerName) {
      // Create a new score object
      const newScore = {
        player_name: playerName,
        score: score,
        level: level,
        lines_cleared: linesCleared
      };
      
      // Try to submit to Supabase
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('high_scores')
            .insert([newScore]);
          
          if (error) {
            throw error;
          }
          
          console.log('Score submitted to Supabase successfully');
          await fetchHighScores(); // Refresh the high scores
        } catch (error) {
          console.error('Error submitting score to Supabase:', error);
          // Fall back to local storage
          addLocalHighScore(newScore);
        }
      } else {
        // If Supabase is not available, use local storage
        addLocalHighScore(newScore);
      }
      
      hideNameInput();
      showLeaderboard();
    }
  }
}

function addLocalHighScore(newScore) {
  // Add to local high scores
  highScores.push(newScore);
  
  // Sort high scores
  highScores.sort((a, b) => b.score - a.score);
  
  // Keep only top 10
  if (highScores.length > 10) {
    highScores = highScores.slice(0, 10);
  }
  
  console.log('Score added to local high scores');
}

function isHighScore(score) {
  if (highScores.length < 10) return true;
  return score > highScores[highScores.length - 1].score;
}

function showNameInput() {
  if (nameInput) {
    nameInput.style.display = 'block';
    nameInput.focus();
  }
}

function hideNameInput() {
  if (nameInput) {
    nameInput.style.display = 'none';
    nameInput.value = '';
  }
}

function showLeaderboard() {
  if (leaderboardDiv) {
    // Populate the leaderboard table
    const tbody = document.getElementById('scoresBody');
    if (tbody) {
      tbody.innerHTML = '';
      
      highScores.forEach((score, index) => {
        const row = document.createElement('tr');
        
        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        
        const nameCell = document.createElement('td');
        nameCell.textContent = score.player_name;
        
        const scoreCell = document.createElement('td');
        scoreCell.textContent = score.score;
        
        const levelCell = document.createElement('td');
        levelCell.textContent = score.level;
        
        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(scoreCell);
        row.appendChild(levelCell);
        
        tbody.appendChild(row);
      });
    }
    
    leaderboardDiv.style.display = 'block';
  }
}

function hideLeaderboard() {
  if (leaderboardDiv) {
    leaderboardDiv.style.display = 'none';
  }
}
