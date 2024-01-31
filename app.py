from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)
connected_players = set()
player_roles = {}  # Dictionary to store player roles
GRID_SIZE = 15
CONNECT_TO_WIN = 5

# Initial board state
initial_board = [[""] * GRID_SIZE for _ in range(GRID_SIZE)]
current_player = "X"


## TODO-riso pridat este kolko je pripojenych a po odpojeni nech 1 nemoze hrat napr nech sa vypise dialog ze sa skoncila hra
## TODO-riso urobit sessions lebo pri pripojeni je socket id stale ine

@app.route('/')
def index():
    return render_template('index.html', board=initial_board)


@socketio.on('connect')
def handle_connect():
    player_id = request.sid
    if len(connected_players) < 2:
        connected_players.add(player_id)

        if player_id not in player_roles:
            if len(player_roles) % 2 == 0:
                player_roles[player_id] = 'X'
            else:
                player_roles[player_id] = 'O'

        current_player = player_roles[player_id]

        emit('player_role', {'role': player_roles[player_id]}, room=player_id)
        emit('current_player', {'current_player': current_player}, broadcast=True)  # Send current player information
    else:
        print(f"too many players {len(connected_players)}")



@socketio.on('disconnect')
def handle_disconnect():
    player_id = request.sid
    del player_roles[player_id]
    connected_players.discard(player_id)


@socketio.on('update_board')
def handle_update_board(data):
    global initial_board, current_player

    player_id = request.sid

    if player_id not in connected_players:
        return  # Ignore moves from unauthorized players

    index = int(data['index'])

    if index == -1:  # Special value for game reset
        initial_board = [[""] * GRID_SIZE for _ in range(GRID_SIZE)]
        current_player = player_roles[player_id]
    else:
        row = index // GRID_SIZE
        col = index % GRID_SIZE
        if 0 <= row < GRID_SIZE and 0 <= col < GRID_SIZE and initial_board[row][col] == "":
            initial_board[row][col] = current_player
            current_player = 'O' if current_player == 'X' else 'X'
        else:
            return  # Ignore invalid moves

    winner = check_winner()
    emit('board_updated', {'board': initial_board, 'current_player': current_player, 'winner': winner}, broadcast=True)
    # flattened_board = [cell for row in initial_board for cell in row]
    # emit('board_updated', {'board': flattened_board, 'current_player': current_player, 'winner': None}, room=player_id)

    emit('current_player', {'current_player': current_player}, broadcast=True)  # Send current player information


def check_winner():
    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            if initial_board[i][j] != "" and \
                    (check_row(i, j) or check_column(i, j) or check_diagonal(i, j)):
                return initial_board[i][j]
    return None


def check_row(row, col):
    count = 0
    player = initial_board[row][col]
    for j in range(GRID_SIZE):
        if initial_board[row][j] == player:
            count += 1
            if count == CONNECT_TO_WIN:
                return True
        else:
            count = 0
    return False


def check_column(row, col):
    count = 0
    player = initial_board[row][col]
    for i in range(GRID_SIZE):
        if initial_board[i][col] == player:
            count += 1
            if count == CONNECT_TO_WIN:
                return True
        else:
            count = 0
    return False


def check_diagonal(row, col):
    count = 0
    player = initial_board[row][col]

    # Check diagonals
    for i in range(GRID_SIZE):
        for j in range(GRID_SIZE):
            if i + CONNECT_TO_WIN <= GRID_SIZE and j + CONNECT_TO_WIN <= GRID_SIZE:
                # Check diagonal from top-left to bottom-right
                if all(initial_board[i + k][j + k] == player for k in range(CONNECT_TO_WIN)):
                    return True
            if i - CONNECT_TO_WIN + 1 >= 0 and j + CONNECT_TO_WIN <= GRID_SIZE:
                # Check diagonal from bottom-left to top-right
                if all(initial_board[i - k][j + k] == player for k in range(CONNECT_TO_WIN)):
                    return True

    return False


if __name__ == '__main__':
    socketio.run(app, debug=True)
