# Minimax Visualizer — Tic-Tac-Toe

An interactive, browser-based visualization of the minimax algorithm applied to Tic-Tac-Toe, built with D3.js. Displays the full game tree from any starting board position and animates how the algorithm evaluates each node.

## Algorithm

Tic-Tac-Toe is a two-player zero-sum game. O is the MAX player (utility +1 on win) and X is the MIN player (utility -1 on win). The visualizer supports both **minimax** and minimax with **alpha-beta pruning**, which eliminates branches that cannot affect the final decision.

## Controls

### Initial State

Set the starting board position by clicking cells, placing O and X turn-by-turn. This guarantees a valid game state. Use **Undo** to step back one placement or **Clear** to reset to a blank board.

### Minimax Settings

| Setting | Options | Effect |
|---|---|---|
| Alpha-Beta Pruning | On / Off | Enables or disables alpha-beta cutoffs |
| Move Ordering | Heuristic / Off / Reversed | Controls the order successors are evaluated; heuristic ordering plays stronger moves first |

### Tree Filtering

| Setting | Effect |
|---|---|
| Forced Moves | Player always plays a winning or blocking move if one exists |
| Symmetrical Moves | Excludes rotations and reflections of positions already in the tree |

### Playback

Step through the algorithm one node at a time or run it continuously. Nodes appear as the algorithm visits them; edges and borders are dimmed until the node's minimax value is known, then color to reflect the result. Pruned subtrees appear grayed out.

| Control | Function |
|---|---|
| ▶ / ⏸ | Play or pause continuous playback |
| ▷\| | Advance one step |
| ■ | Stop playback and restore the full tree |
| Speed | Playback speed from 1–10 steps per second |

### Actions

| Button | Function |
|---|---|
| Redraw | Rebuild the tree with the current settings |
| Revert | Restore settings to those used at the last Redraw |
| Reset | Restore all settings to defaults |

## Display

Each node in the tree shows the board state at that point in the game. Terminal nodes display their utility value (+1, -1, or 0) below the board and are outlined in green (O win), red (X win), or blue (draw). Non-terminal nodes are outlined in a desaturated version of the same colors once their minimax value is known. Row labels on the left indicate whose turn it is at each depth. The Statistics panel shows total node count, leaf count, and pruning rate.

## Usage

A live version is available at [tmillhouua.github.io/MinimaxVisualizerTTT](https://tmillhouua.github.io/MinimaxVisualizerTTT/).

Alternatively, clone or download the repository and open `index.html` directly in a browser. The visualization runs entirely in the browser with no build step or server required.

## Dependencies

All dependencies are bundled locally in the `d3/` folder — no internet connection required.

| Library | Version |
|---|---|
| D3 | v4 |
