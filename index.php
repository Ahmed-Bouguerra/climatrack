<?php
// index.php - API minimale pour Climatrack
// Remplacez / adaptez selon votre environnement avant mise en production.

// ------------------ CONFIG ------------------
$allowed_origins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200'
];

// ------------------ HELPERS ------------------
function respond(int $statusCode, array $payload) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// Lecture du body JSON
function getJsonBody(): array {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Nettoyage simple des inputs (vous pouvez renforcer selon besoins)
function clean(string $v): string {
    return trim($v);
}

// ------------------ CORS ------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    // En dev on autorise localhost ; en production, liste restreinte recommandée
    header("Access-Control-Allow-Origin: http://localhost:4200");
}
header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Security-Policy: default-src 'self' https://maps.googleapis.com https://maps.gstatic.com; script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; img-src 'self' data: https://maps.gstatic.com; connect-src 'self' https://maps.googleapis.com;");
// Répondre aux préflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ------------------ DB CONNECTION ------------------
// Configurez ces valeurs selon votre environnement
$dbHost = "localhost";
$dbUser = "root";
$dbPass = "";
$dbName = "climatrack_db";

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    respond(500, ["status" => "error", "message" => "DB connection error"]);
}
$conn->set_charset('utf8mb4');

// ------------------ ROUTING / INPUTS ------------------
$data = getJsonBody();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $data['action'] ?? '';

// Extraction courante d'email/password si fournis (utiles pour register/login)
$email = isset($data['email']) ? clean((string)$data['email']) : '';
$password = isset($data['password']) ? (string)$data['password'] : '';

// ------------------ UTILITAIRES SQL ------------------
function stmt_prepare_or_respond($conn, string $sql) {
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        respond(500, ["status" => "error", "message" => "DB prepare error", "sql_error" => $conn->error]);
    }
    return $stmt;
}

// ================== GET FARMERS ==================
if ($action === 'farmers' && $method === 'GET') {
    $farmer_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($farmer_id) {
        $stmt = stmt_prepare_or_respond($conn, "SELECT id, nom, prenom, email, telephone, adresse FROM users WHERE id=? AND role='agriculteur' LIMIT 1");
        $stmt->bind_param("i", $farmer_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $farmer = $res->fetch_assoc();
        if ($farmer) {
            respond(200, $farmer);
        } else {
            respond(404, ["status" => "error", "message" => "Agriculteur non trouvé"]);
        }
    }

    $query = "SELECT id, nom, prenom, email, telephone, adresse FROM users WHERE role='agriculteur'";
    $result = $conn->query($query);
    if (!$result) {
        respond(500, ["status" => "error", "message" => "DB query error", "sql_error" => $conn->error]);
    }
    $farmers = [];
    while ($row = $result->fetch_assoc()) {
        $farmers[] = $row;
    }
    respond(200, $farmers);
}

// ================== DELETE FARMER ==================
if ($action === 'farmers' && $method === 'DELETE') {
    // id peut venir en query param ou dans le body JSON
    $farmer_id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($data['id']) ? (int)$data['id'] : null);

    if (!$farmer_id) {
        respond(400, ["status" => "error", "message" => "id required"]);
    }

    $stmt = stmt_prepare_or_respond($conn, "DELETE FROM users WHERE id=? AND role='agriculteur'");
    $stmt->bind_param("i", $farmer_id);
    if (!$stmt->execute()) {
        respond(500, ["status" => "error", "message" => "Erreur lors de la suppression", "sql_error" => $stmt->error]);
    }

    if ($stmt->affected_rows > 0) {
        respond(200, ["status" => "ok", "message" => "Agriculteur supprimé avec succès"]);
    } else {
        respond(404, ["status" => "error", "message" => "Agriculteur non trouvé"]);
    }
}

// ================== REGISTER ==================
if ($action === 'register' && $method === 'POST') {
    $nom = clean((string)($data['nom'] ?? ''));
    $prenom = clean((string)($data['prenom'] ?? ''));
    $telephone = clean((string)($data['telephone'] ?? ''));
    $adresse = clean((string)($data['adresse'] ?? ''));
    $role = clean((string)($data['role'] ?? 'agriculteur'));
    $email = clean((string)($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if (!$email || !$password || !$nom || !$prenom) {
        respond(400, ["status" => "error", "message" => "Champs requis manquants (nom, prenom, email, password)"]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(400, ["status" => "error", "message" => "Email invalide"]);
    }

    // check email uniqueness
    $check = stmt_prepare_or_respond($conn, "SELECT id FROM users WHERE email=? LIMIT 1");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        respond(409, ["status" => "error", "message" => "Email déjà utilisé"]);
    }

    // hash du mot de passe
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // insert user
    $stmt = stmt_prepare_or_respond($conn,
        "INSERT INTO users (nom, prenom, email, password, telephone, adresse, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    $stmt->bind_param(
        "sssssss",
        $nom,
        $prenom,
        $email,
        $hashedPassword,
        $telephone,
        $adresse,
        $role
    );

    if (!$stmt->execute()) {
        respond(500, ["status" => "error", "message" => "Erreur lors de la création du compte", "sql_error" => $stmt->error]);
    }

    $newId = $stmt->insert_id;
    respond(201, ["status" => "ok", "message" => "Compte créé avec succès", "user_id" => $newId]);
}

// ================== LOGIN ==================
if ($action === 'login' && $method === 'POST') {
    $email = clean((string)($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if (!$email || !$password) {
        respond(400, ["status" => "error", "message" => "Email et mot de passe requis"]);
    }

    $stmt = stmt_prepare_or_respond($conn, "SELECT id, role, password FROM users WHERE email=? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();

    if (!$user) {
        respond(401, ["status" => "error", "message" => "Email ou mot de passe incorrect"]);
    }

    // vérifier le mot de passe hashé
    if (!password_verify($password, $user['password'])) {
        respond(401, ["status" => "error", "message" => "Email ou mot de passe incorrect"]);
    }

    // Générer un token (ici usage simple ; en prod utilisez JWT ou autre et stockez/validez côté serveur)
    $token = bin2hex(random_bytes(16));

    respond(200, [
        "status" => "ok",
        "token" => $token,
        "user_id" => (int)$user['id'],
        "role" => $user['role']
    ]);
}

// ================== GET PROFILE ==================
if ($action === 'profile' && $method === 'GET') {
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

    if (!$user_id) {
        respond(400, ["status" => "error", "message" => "user_id required"]);
    }

    $stmt = stmt_prepare_or_respond($conn, "SELECT id, nom, prenom, email, telephone, adresse, role FROM users WHERE id=? LIMIT 1");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();
    if ($user) {
        respond(200, $user);
    } else {
        respond(404, ["status" => "error", "message" => "Utilisateur non trouvé"]);
    }
}

// ================== UPDATE PROFILE ==================
if ($action === 'profile' && $method === 'PUT') {
    $payload = $data;
    $user_id = isset($payload['id']) ? (int)$payload['id'] : null;
    $nom = clean((string)($payload['nom'] ?? ''));
    $prenom = clean((string)($payload['prenom'] ?? ''));
    $telephone = clean((string)($payload['telephone'] ?? ''));
    $adresse = clean((string)($payload['adresse'] ?? ''));

    if (!$user_id) {
        respond(400, ["status" => "error", "message" => "id required"]);
    }

    $stmt = stmt_prepare_or_respond($conn,
        "UPDATE users SET nom=?, prenom=?, telephone=?, adresse=? WHERE id=?"
    );
    $stmt->bind_param("ssssi", $nom, $prenom, $telephone, $adresse, $user_id);

    if ($stmt->execute()) {
        respond(200, ["status" => "ok", "message" => "Profil mis à jour avec succès"]);
    } else {
        respond(500, ["status" => "error", "message" => "Erreur lors de la mise à jour", "sql_error" => $stmt->error]);
    }
}

// ================== CHANGE PASSWORD ==================
if ($action === 'changePassword' && $method === 'PUT') {
    $payload = $data;
    $user_id = isset($payload['id']) ? (int)$payload['id'] : null;
    $currentPassword = (string)($payload['currentPassword'] ?? '');
    $newPassword = (string)($payload['newPassword'] ?? '');

    if (!$user_id || $currentPassword === '' || $newPassword === '') {
        respond(400, ["status" => "error", "message" => "Tous les champs sont requis"]);
    }

    if (strlen($newPassword) < 6) {
        respond(400, ["status" => "error", "message" => "Le nouveau mot de passe doit contenir au moins 6 caractères"]);
    }

    $check = stmt_prepare_or_respond($conn, "SELECT password FROM users WHERE id=? LIMIT 1");
    $check->bind_param("i", $user_id);
    $check->execute();
    $res = $check->get_result();
    $user = $res->fetch_assoc();

    if (!$user) {
        respond(404, ["status" => "error", "message" => "Utilisateur non trouvé"]);
    }

    // Vérifier mot de passe actuel
    if (!password_verify($currentPassword, $user['password'])) {
        respond(401, ["status" => "error", "message" => "Mot de passe actuel incorrect"]);
    }

    // Mettre à jour avec hash
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = stmt_prepare_or_respond($conn, "UPDATE users SET password=? WHERE id=?");
    $stmt->bind_param("si", $hashedPassword, $user_id);
    if ($stmt->execute()) {
        respond(200, ["status" => "success", "message" => "Mot de passe modifié avec succès"]);
    } else {
        respond(500, ["status" => "error", "message" => "Erreur lors de la mise à jour en base de données", "sql_error" => $stmt->error]);
    }
}
// ================== PARCELLES (admin) ==================
if ($action === 'parcelles') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

        if ($id) {
            $stmt = stmt_prepare_or_respond($conn, "SELECT id, user_id, nom, surface, localisation, created_at FROM parcelles WHERE id=? LIMIT 1");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $res = $stmt->get_result();
            $p = $res->fetch_assoc();
            if ($p) respond(200, $p);
            respond(404, ["status"=>"error","message"=>"Parcelle non trouvée"]);
        }

        if ($user_id) {
            $stmt = stmt_prepare_or_respond($conn, "SELECT id, user_id, nom, surface, localisation, created_at FROM parcelles WHERE user_id=? ORDER BY created_at DESC");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $list = [];
            while ($row = $res->fetch_assoc()) $list[] = $row;
            respond(200, $list);
        }

        // all parcelles (optionnel)
        $res = $conn->query("SELECT id, user_id, nom, surface, localisation, created_at FROM parcelles ORDER BY created_at DESC");
        $list = [];
        while ($row = $res->fetch_assoc()) $list[] = $row;
        respond(200, $list);
    }

    if ($method === 'POST') {
        $payload = $data;
        $user_id = isset($payload['user_id']) ? (int)$payload['user_id'] : null;
        $nom = clean((string)($payload['nom'] ?? ''));
        $surface = isset($payload['surface']) ? (float)$payload['surface'] : null;
        $localisation = clean((string)($payload['localisation'] ?? ''));

        if (!$user_id || $nom === '') {
            respond(400, ["status"=>"error","message"=>"user_id et nom requis"]);
        }

        $stmt = stmt_prepare_or_respond($conn, "INSERT INTO parcelles (user_id, nom, surface, localisation) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isds", $user_id, $nom, $surface, $localisation);
        if (!$stmt->execute()) respond(500, ["status"=>"error","message"=>"DB insert error","sql_error"=>$stmt->error]);

        $newId = $stmt->insert_id;
        respond(201, ["status"=>"ok","message"=>"Parcelle créée","id"=>$newId]);
    }

    if ($method === 'PUT') {
        $payload = $data;
        $id = isset($payload['id']) ? (int)$payload['id'] : null;
        if (!$id) respond(400, ["status"=>"error","message"=>"id requis"]);

        $nom = array_key_exists('nom', $payload) ? clean((string)$payload['nom']) : null;
        $surface = array_key_exists('surface', $payload) ? (float)$payload['surface'] : null;
        $localisation = array_key_exists('localisation', $payload) ? clean((string)$payload['localisation']) : null;

        $fields = []; $types = ""; $values = [];
        if ($nom !== null) { $fields[] = "nom=?"; $types .= "s"; $values[] = $nom; }
        if ($surface !== null) { $fields[] = "surface=?"; $types .= "d"; $values[] = $surface; }
        if ($localisation !== null) { $fields[] = "localisation=?"; $types .= "s"; $values[] = $localisation; }

        if (empty($fields)) respond(400, ["status"=>"error","message"=>"no fields to update"]);

        $sql = "UPDATE parcelles SET " . implode(", ", $fields) . " WHERE id=?";
        $types .= "i"; $values[] = $id;
        $stmt = stmt_prepare_or_respond($conn, $sql);
        // bind params dynamiquement
        $stmt->bind_param($types, ...$values);
        if (!$stmt->execute()) respond(500, ["status"=>"error","message"=>"DB update error","sql_error"=>$stmt->error]);

        respond(200, ["status"=>"ok","message"=>"Parcelle mise à jour"]);
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($data['id']) ? (int)$data['id'] : null);
        if (!$id) respond(400, ["status"=>"error","message"=>"id requis"]);
        $stmt = stmt_prepare_or_respond($conn, "DELETE FROM parcelles WHERE id=?");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) respond(500, ["status"=>"error","message"=>"DB delete error","sql_error"=>$stmt->error]);
        if ($stmt->affected_rows > 0) respond(200, ["status"=>"ok","message"=>"Parcelle supprimée"]);
        respond(404, ["status"=>"error","message"=>"Parcelle non trouvée"]);
    }
}
// ================== ADDITION : endpoints parcelles avancés (AJOUTS, NE MODIFIENT PAS L'EXISTANT) ==================
if ($action === 'parcelles_full' && $method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

    if ($id) {
        $stmt = stmt_prepare_or_respond($conn,
            "SELECT parcelles.id, parcelles.user_id, parcelles.nom, parcelles.surface, parcelles.localisation, parcelles.created_at,
                    users.nom AS nom_agriculteur, users.prenom AS prenom_agriculteur
             FROM parcelles
             JOIN users ON parcelles.user_id = users.id
             WHERE parcelles.id = ? LIMIT 1"
        );
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $res = $stmt->get_result();
        $p = $res->fetch_assoc();
        if ($p) respond(200, $p);
        respond(404, ["status" => "error", "message" => "Parcelle non trouvée"]);
    }

    if ($user_id) {
        $stmt = stmt_prepare_or_respond($conn,
            "SELECT parcelles.id, parcelles.user_id, parcelles.nom, parcelles.surface, parcelles.localisation, parcelles.created_at,
                    users.nom AS nom_agriculteur, users.prenom AS prenom_agriculteur
             FROM parcelles
             JOIN users ON parcelles.user_id = users.id
             WHERE parcelles.user_id = ?
             ORDER BY parcelles.created_at DESC"
        );
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $list = [];
        while ($row = $res->fetch_assoc()) $list[] = $row;
        respond(200, $list);
    }

    // fallback: toutes les parcelles avec nom/prenom agriculteur
    $res = $conn->query(
        "SELECT parcelles.id, parcelles.user_id, parcelles.nom, parcelles.surface, parcelles.localisation, parcelles.created_at,
                users.nom AS nom_agriculteur, users.prenom AS prenom_agriculteur
         FROM parcelles
         JOIN users ON parcelles.user_id = users.id
         ORDER BY parcelles.created_at DESC"
    );
    if (!$res) {
        respond(500, ["status" => "error", "message" => "DB query error", "sql_error" => $conn->error]);
    }
    $list = [];
    while ($row = $res->fetch_assoc()) $list[] = $row;
    respond(200, $list);
}

if ($action === 'parcelles_count' && $method === 'GET') {
    // retourne la liste des agriculteurs avec le nombre total de parcelles (LEFT JOIN)
    $res = $conn->query(
        "SELECT users.id AS user_id, users.nom, users.prenom, COUNT(parcelles.id) AS total_parcelles
         FROM users
         LEFT JOIN parcelles ON users.id = parcelles.user_id
         WHERE users.role = 'agriculteur'
         GROUP BY users.id
         ORDER BY users.nom, users.prenom"
    );
    if (!$res) {
        respond(500, ["status" => "error", "message" => "DB query error", "sql_error" => $conn->error]);
    }
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    respond(200, $rows);
}




// ================== PARCELLES (admin & user) ==================
if ($action === 'parcelles') {
    if ($method === 'GET') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
        $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

        if ($id) {
            $stmt = stmt_prepare_or_respond($conn, "SELECT id, user_id, nom, surface, localisation, latitude, longitude, altitude, polygon, created_at FROM parcelles WHERE id=? LIMIT 1");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $res = $stmt->get_result();
            $p = $res->fetch_assoc();
            if ($p) respond(200, $p);
            respond(404, ["status"=>"error","message"=>"Parcelle non trouvée"]);
        }

        if ($user_id) {
            $stmt = stmt_prepare_or_respond($conn, "SELECT id, user_id, nom, surface, localisation, latitude, longitude, altitude, polygon, created_at FROM parcelles WHERE user_id=? ORDER BY created_at DESC");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $res = $stmt->get_result();
            $list = [];
            while ($row = $res->fetch_assoc()) $list[] = $row;
            respond(200, $list);
        }

        // all parcelles (optionnel)
        $res = $conn->query("SELECT id, user_id, nom, surface, localisation, latitude, longitude, altitude, polygon, created_at FROM parcelles ORDER BY created_at DESC");
        $list = [];
        while ($row = $res->fetch_assoc()) $list[] = $row;
        respond(200, $list);
    }

    if ($method === 'POST') {
        $payload = $data;
        $user_id = isset($payload['user_id']) ? (int)$payload['user_id'] : null;
        $nom = isset($payload['nom']) ? clean((string)$payload['nom']) : '';
        $surface = isset($payload['surface']) ? $payload['surface'] : null;
        $localisation = isset($payload['localisation']) ? clean((string)$payload['localisation']) : null;
        $latitude = isset($payload['latitude']) ? $payload['latitude'] : null;
        $longitude = isset($payload['longitude']) ? $payload['longitude'] : null;
        $altitude = isset($payload['altitude']) ? $payload['altitude'] : null;
        $polygon = isset($payload['polygon']) ? (string)$payload['polygon'] : null;

        if (!$user_id) {
            respond(400, ["status" => "error", "message" => "user_id required"]);
        }

        $stmt = stmt_prepare_or_respond($conn, "INSERT INTO parcelles (user_id, nom, surface, localisation, latitude, longitude, altitude, polygon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        // Bind everything as string except user_id (MySQL will convert numeric strings to numbers)
        $s_surface = $surface !== null ? (string)$surface : null;
        $s_lat = $latitude !== null ? (string)$latitude : null;
        $s_lng = $longitude !== null ? (string)$longitude : null;
        $s_alt = $altitude !== null ? (string)$altitude : null;
        $stmt->bind_param("isssssss", $user_id, $nom, $s_surface, $localisation, $s_lat, $s_lng, $s_alt, $polygon);

        if ($stmt->execute()) {
            $id = $conn->insert_id;
            // return the newly inserted parcelle
            $stmt2 = stmt_prepare_or_respond($conn, "SELECT id, user_id, nom, surface, localisation, latitude, longitude, altitude, polygon, created_at FROM parcelles WHERE id=? LIMIT 1");
            $stmt2->bind_param("i", $id);
            $stmt2->execute();
            $res = $stmt2->get_result();
            $p = $res->fetch_assoc();
            respond(201, $p);
        } else {
            respond(500, ["status" => "error", "message" => "Erreur insertion parcelle", "sql_error" => $stmt->error]);
        }
    }

    if ($method === 'PUT') {
        $payload = $data;
        $id = isset($payload['id']) ? (int)$payload['id'] : null;
        if (!$id) respond(400, ["status" => "error", "message" => "id required"]);

        $nom = isset($payload['nom']) ? clean((string)$payload['nom']) : null;
        $surface = array_key_exists('surface', $payload) ? $payload['surface'] : null;
        $localisation = array_key_exists('localisation', $payload) ? clean((string)$payload['localisation']) : null;
        $latitude = array_key_exists('latitude', $payload) ? $payload['latitude'] : null;
        $longitude = array_key_exists('longitude', $payload) ? $payload['longitude'] : null;
        $altitude = array_key_exists('altitude', $payload) ? $payload['altitude'] : null;
        $polygon = array_key_exists('polygon', $payload) ? (string)$payload['polygon'] : null;

        // Build update dynamically to allow partial updates
        $fields = [];
        $types = '';
        $values = [];
        if ($nom !== null) { $fields[] = 'nom=?'; $types .= 's'; $values[] = $nom; }
        if ($surface !== null) { $fields[] = 'surface=?'; $types .= 's'; $values[] = (string)$surface; }
        if ($localisation !== null) { $fields[] = 'localisation=?'; $types .= 's'; $values[] = $localisation; }
        if ($latitude !== null) { $fields[] = 'latitude=?'; $types .= 's'; $values[] = (string)$latitude; }
        if ($longitude !== null) { $fields[] = 'longitude=?'; $types .= 's'; $values[] = (string)$longitude; }
        if ($altitude !== null) { $fields[] = 'altitude=?'; $types .= 's'; $values[] = (string)$altitude; }
        if ($polygon !== null) { $fields[] = 'polygon=?'; $types .= 's'; $values[] = $polygon; }

        if (empty($fields)) {
            respond(400, ["status" => "error", "message" => "No fields to update"]);
        }

        $sql = "UPDATE parcelles SET " . implode(', ', $fields) . " WHERE id=?";
        $stmt = stmt_prepare_or_respond($conn, $sql);
        // bind params dynamically
        $types .= 'i';
        $values[] = $id;
        // mysqli_bind_param requires variables by reference
        $bind_names[] = $types;
        for ($i=0; $i<count($values); $i++) {
            $bind_name = 'bind' . $i;
            $$bind_name = $values[$i];
            $bind_names[] = &$$bind_name;
        }
        call_user_func_array([$stmt, 'bind_param'], $bind_names);

        if ($stmt->execute()) {
            // return updated row
            $stmt2 = stmt_prepare_or_respond($conn, "SELECT id, user_id, nom, surface, localisation, latitude, longitude, altitude, polygon, created_at FROM parcelles WHERE id=? LIMIT 1");
            $stmt2->bind_param("i", $id);
            $stmt2->execute();
            $res = $stmt2->get_result();
            $p = $res->fetch_assoc();
            respond(200, $p);
        } else {
            respond(500, ["status" => "error", "message" => "Erreur update parcelle", "sql_error" => $stmt->error]);
        }
    }

    if ($method === 'DELETE') {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($data['id']) ? (int)$data['id'] : null);
        if (!$id) respond(400, ["status" => "error", "message" => "id required"]);
        $stmt = stmt_prepare_or_respond($conn, "DELETE FROM parcelles WHERE id=?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) respond(200, ["status" => "ok"]);
        respond(500, ["status" => "error", "message" => "Erreur suppression", "sql_error" => $stmt->error]);
    }
}


// ================== PARCELLE_METEO DETAILS ==================
$dbHost = "localhost";
$dbUser = "root";
$dbPass = "";
$dbName = "climatrack_db";

$openWeatherApiKey = getenv('OPENWEATHER_API_KEY') ?: 'YOUR_OPENWEATHER_API_KEY_HERE';
if ($openWeatherApiKey === 'YOUR_OPENWEATHER_API_KEY_HERE') {
    echo "[" . date('c') . "] WARNING: OPENWEATHER_API_KEY not set\n";
    // you may exit(1) if you want to force configuration
}

$baseUrl = "https://api.openweathermap.org/data/2.5/weather";

$conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    echo "DB error: " . $conn->connect_error . PHP_EOL;
    exit(1);
}
$conn->set_charset('utf8mb4');

// get parcelles with coordinates
$q = "SELECT id, latitude, longitude FROM parcelles WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND latitude <> '' AND longitude <> ''";
$res = $conn->query($q);
if (!$res) {
    echo "DB query error: " . $conn->error . PHP_EOL;
    exit(1);
}

$insertStmt = $conn->prepare("INSERT INTO meteo_data (parcelle_id, temperature, humidite, pluie, vent, date_releve, is_cold) VALUES (?, ?, ?, ?, ?, ?, ?)");
if ($insertStmt === false) {
    echo "Prepare insert error: " . $conn->error . PHP_EOL;
    exit(1);
}

$checkStmt = $conn->prepare("SELECT id FROM meteo_data WHERE parcelle_id = ? AND date_releve = ? LIMIT 1");
if ($checkStmt === false) {
    echo "Prepare check error: " . $conn->error . PHP_EOL;
    exit(1);
}

while ($row = $res->fetch_assoc()) {
    $pid = (int)$row['id'];
    $lat = $row['latitude'];
    $lon = $row['longitude'];

    // build request
    $url = $baseUrl . "?lat=" . urlencode($lat) . "&lon=" . urlencode($lon) . "&units=metric&appid=" . $openWeatherApiKey;

    // call API
    $opts = [
        "http" => [
            "method" => "GET",
            "timeout" => 10
        ]
    ];
    $context = stream_context_create($opts);
    $resp = @file_get_contents($url, false, $context);
    if ($resp === false) {
        echo "[" . date('c') . "] API request failed for parcelle {$pid} ({$lat},{$lon})\n";
        continue;
    }
    $json = json_decode($resp, true);
    if (!is_array($json)) {
        echo "[" . date('c') . "] Invalid JSON for parcelle {$pid}\n";
        continue;
    }

    $temp = isset($json['main']['temp']) ? floatval($json['main']['temp']) : null;
    $hum = isset($json['main']['humidity']) ? floatval($json['main']['humidity']) : null;
    $wind = isset($json['wind']['speed']) ? floatval($json['wind']['speed']) : 0.0;
    // rain may be under rain['1h'] or rain['3h']
    $rain = 0.0;
    if (isset($json['rain']['1h'])) $rain = floatval($json['rain']['1h']);
    elseif (isset($json['rain']['3h'])) $rain = floatval($json['rain']['3h']);

    $is_cold = ($temp !== null && $temp < 7.0) ? 1 : 0;

    // round date to hour start to avoid duplicate hourly inserts
    $date_releve = date('Y-m-d H:00:00');

    // check existing
    $checkStmt->bind_param("is", $pid, $date_releve);
    $checkStmt->execute();
    $checkStmt->store_result();
    if ($checkStmt->num_rows > 0) {
        echo "[" . date('c') . "] Relevé already exists for parcelle {$pid} at {$date_releve}, skipping\n";
        $checkStmt->free_result();
        continue;
    }
    $checkStmt->free_result();

    // insert
    // types: i (parcelle_id), d temp, d humidity, d pluie, d vent, s date, i is_cold => "iddddsi"
    $insertStmt->bind_param("iddddsi", $pid, $temp, $hum, $rain, $wind, $date_releve, $is_cold);
    if (!$insertStmt->execute()) {
        echo "[" . date('c') . "] Insert failed for parcelle {$pid}: " . $insertStmt->error . "\n";
        continue;
    }
    echo "[" . date('c') . "] Inserted meteo for parcelle {$pid} (temp={$temp}, hum={$hum}, rain={$rain}, wind={$wind}, is_cold={$is_cold})\n";

    // respect rate limits - tiny sleep to be polite
    usleep(200000); // 200ms
}

$insertStmt->close();
$checkStmt->close();
$conn->close();
// ----------------- METEO HISTORY / SUMMARY -----------------
if ($action === 'meteo_history' && $method === 'GET') {
    $parcelle_id = isset($_GET['parcelle_id']) ? (int)$_GET['parcelle_id'] : null;
    if (!$parcelle_id) {
        respond(400, ["status" => "error", "message" => "parcelle_id required"]);
    }

    // optional: limit number of records (default 48 = last 48 hours)
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 48;

    // fetch recent records
    $stmt = stmt_prepare_or_respond($conn, "SELECT id, parcelle_id, temperature, humidite, pluie, vent, date_releve, is_cold FROM meteo_data WHERE parcelle_id = ? ORDER BY date_releve DESC LIMIT ?");
    $stmt->bind_param("ii", $parcelle_id, $limit);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;

    // compute number of hours with temp < 7 in last 24h
    $stmt2 = stmt_prepare_or_respond($conn, "SELECT COUNT(*) AS cold_hours FROM meteo_data WHERE parcelle_id = ? AND is_cold = 1 AND date_releve >= (NOW() - INTERVAL 24 HOUR)");
    $stmt2->bind_param("i", $parcelle_id);
    $stmt2->execute();
    $res2 = $stmt2->get_result();
    $cold_count = 0;
    if ($r2 = $res2->fetch_assoc()) $cold_count = (int)$r2['cold_hours'];

    respond(200, ["data" => $rows, "cold_hours_last_24h" => $cold_count]);
}

// ================== DEFAULT ==================
respond(400, ["status" => "error", "message" => "Invalid action"]);