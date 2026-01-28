<?php

// ================== HEADERS ==================
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ================== DB CONNECTION ==================
$conn = new mysqli("localhost", "root", "", "climatrack_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["status"=>"error","message"=>"DB error"]);
    exit;
}

// ================== READ DATA ==================
$data = json_decode(file_get_contents("php://input"), true) ?? [];
$action = $_GET['action'] ?? $data['action'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

// ================== GET FARMERS ==================
if ($action === 'farmers' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $farmer_id = $_GET['id'] ?? null;
    
    // Get single farmer by ID
    if ($farmer_id) {
        $stmt = $conn->prepare("SELECT id, nom, prenom, email, telephone, adresse FROM users WHERE id=? AND role='agriculteur'");
        $stmt->bind_param("i", $farmer_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($farmer = $result->fetch_assoc()) {
            echo json_encode($farmer);
        } else {
            http_response_code(404);
            echo json_encode(["status"=>"error","message"=>"Agriculteur non trouvé"]);
        }
        exit;
    }
    
    // Get all farmers
    $query = "SELECT id, nom, prenom, email, telephone, adresse FROM users WHERE role='agriculteur'";
    $result = $conn->query($query);
    
    if (!$result) {
        http_response_code(500);
        echo json_encode(["status"=>"error","message"=>"DB query error"]);
        exit;
    }
    
    $farmers = [];
    while ($row = $result->fetch_assoc()) {
        $farmers[] = $row;
    }
    
    echo json_encode($farmers);
    exit;
}

// ================== DELETE FARMERS ==================
if ($action === 'farmers' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $farmer_id = $_GET['id'] ?? $data['id'] ?? null;
    
    if (!$farmer_id) {
        http_response_code(400);
        echo json_encode(["status"=>"error","message"=>"id required"]);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM users WHERE id=? AND role='agriculteur'");
    $stmt->bind_param("i", $farmer_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            http_response_code(200);
            echo json_encode(["status"=>"ok","message"=>"Agriculteur supprimé avec succès"]);
        } else {
            http_response_code(404);
            echo json_encode(["status"=>"error","message"=>"Agriculteur non trouvé"]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["status"=>"error","message"=>"Erreur lors de la suppression"]);
    }
    exit;
}

// ================== REGISTER ==================
if ($action === 'register') {

    $nom = $data['nom'] ?? '';
    $prenom = $data['prenom'] ?? '';
    $telephone = $data['telephone'] ?? '';
    $adresse = $data['adresse'] ?? '';
    $role = $data['role'] ?? 'agriculteur';

    // check email
    $check = $conn->prepare("SELECT id FROM users WHERE email=?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        http_response_code(409);
        echo json_encode(["status"=>"error","message"=>"Email déjà utilisé"]);
        exit;
    }

    // insert user
    $stmt = $conn->prepare(
        "INSERT INTO users (nom, prenom, email, password, telephone, adresse, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    $stmt->bind_param(
        "sssssss",
        $nom,
        $prenom,
        $email,
        $password,
        $telephone,
        $adresse,
        $role
    );

    $stmt->execute();

    echo json_encode([
        "status"=>"ok",
        "message"=>"Compte créé avec succès"
    ]);
    exit;
}

// ================== LOGIN ==================
if ($action === 'login') {

    $stmt = $conn->prepare(
        "SELECT id, role FROM users WHERE email=? AND password=?"
    );
    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        echo json_encode([
            "status" => "ok",
            "token" => bin2hex(random_bytes(16)),
            "user_id" => $user['id'],
            "role" => $user['role']
        ]);
        exit;
    }

    http_response_code(401);
    echo json_encode([
        "status"=>"error",
        "message"=>"Email ou mot de passe incorrect"
    ]);
    exit;
}

// ================== GET PROFILE ==================
if ($action === 'profile' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(["status"=>"error","message"=>"user_id required"]);
        exit;
    }
    
    $stmt = $conn->prepare("SELECT id, nom, prenom, email, telephone, adresse, role FROM users WHERE id=?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($user = $result->fetch_assoc()) {
        echo json_encode($user);
    } else {
        http_response_code(404);
        echo json_encode(["status"=>"error","message"=>"Utilisateur non trouvé"]);
    }
    exit;
}

// ================== UPDATE PROFILE ==================
if ($action === 'profile' && $_SERVER['REQUEST_METHOD'] === 'PUT') {
    $user_id = $data['id'] ?? null;
    $nom = $data['nom'] ?? '';
    $prenom = $data['prenom'] ?? '';
    $telephone = $data['telephone'] ?? '';
    $adresse = $data['adresse'] ?? '';
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode(["status"=>"error","message"=>"id required"]);
        exit;
    }
    
    $stmt = $conn->prepare(
        "UPDATE users SET nom=?, prenom=?, telephone=?, adresse=? WHERE id=?"
    );
    $stmt->bind_param("ssssi", $nom, $prenom, $telephone, $adresse, $user_id);
    
    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode([
            "status" => "ok",
            "message" => "Profil mis à jour avec succès"
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Erreur lors de la mise à jour"
        ]);
    }
    exit;
}

// ================== CHANGE PASSWORD ==================
if ($action === 'changePassword' && $_SERVER['REQUEST_METHOD'] === 'PUT') {
    $user_id = $data['id'] ?? null;
    $currentPassword = $data['currentPassword'] ?? '';
    $newPassword = $data['newPassword'] ?? '';
    
    if (!$user_id || !$currentPassword || !$newPassword) {
        http_response_code(400);
        echo json_encode(["status"=>"error","message"=>"Tous les champs sont requis"]);
        exit;
    }
    
    if (strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode(["status"=>"error","message"=>"Le nouveau mot de passe doit contenir au moins 6 caractères"]);
        exit;
    }
    
    // Vérifier le mot de passe actuel
    $check = $conn->prepare("SELECT password FROM users WHERE id=?");
    $check->bind_param("i", $user_id);
    $check->execute();
    $result = $check->get_result();
    
    if ($user = $result->fetch_assoc()) {
        // Si vous utilisez le hashage (recommandé), utilisez password_verify()
        // Sinon, comparaison directe comme vous faites dans le login
        if ($user['password'] === $currentPassword) {
            // Si vous voulez implémenter le hashage, remplacez par :
            // $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            
            // Mettre à jour le mot de passe
            $stmt = $conn->prepare("UPDATE users SET password=? WHERE id=?");
            $stmt->bind_param("si", $newPassword, $user_id); // Remplacez $newPassword par $hashedPassword si hashage
            
            if ($stmt->execute()) {
                echo json_encode([
                    "status" => "success",
                    "message" => "Mot de passe modifié avec succès"
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "status" => "error",
                    "message" => "Erreur lors de la mise à jour en base de données"
                ]);
            }
        } else {
            http_response_code(401);
            echo json_encode([
                "status" => "error",
                "message" => "Mot de passe actuel incorrect"
            ]);
        }
    } else {
        http_response_code(404);
        echo json_encode(["status"=>"error","message"=>"Utilisateur non trouvé"]);
    }
    exit;
}
    
// ================== PARCELLES (CRUD) & METEO ==================
if ($action === 'parcelles') {
    // GET: liste des parcelles d'un utilisateur
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $user_id = $_GET['user_id'] ?? null;
        if (!$user_id) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"user_id required"]); exit; }

        $stmt = $conn->prepare("SELECT id, user_id, nom, surface, localisation, lat, lng, polygon, created_at FROM parcelles WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $out = [];
        while ($row = $res->fetch_assoc()) $out[] = $row;
        echo json_encode($out);
        exit;
    }

    // POST: create
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $user_id = $data['user_id'] ?? null;
        if (!$user_id) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"user_id required"]); exit; }

        $nom = $data['nom'] ?? null;
        $surface = isset($data['surface']) ? $data['surface'] : null;
        $localisation = $data['localisation'] ?? null;
        $lat = isset($data['lat']) ? $data['lat'] : null;
        $lng = isset($data['lng']) ? $data['lng'] : null;
        $polygon = $data['polygon'] ?? null;

        $stmt = $conn->prepare("INSERT INTO parcelles (user_id, nom, surface, localisation, lat, lng, polygon) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssss", $user_id, $nom, $surface, $localisation, $lat, $lng, $polygon);

        if ($stmt->execute()) {
            $insertedId = $stmt->insert_id;
            $stmt2 = $conn->prepare("SELECT id, user_id, nom, surface, localisation, lat, lng, polygon, created_at FROM parcelles WHERE id = ?");
            $stmt2->bind_param("i", $insertedId);
            $stmt2->execute();
            $r = $stmt2->get_result()->fetch_assoc();
            echo json_encode(["status"=>"ok","parcelle"=>$r]);
        } else {
            http_response_code(500);
            echo json_encode(["status"=>"error","message"=>"Erreur insertion parcelle"]);
        }
        exit;
    }

    // PUT: update
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $id = $data['id'] ?? null;
        if (!$id) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"id required"]); exit; }

        $nom = array_key_exists('nom',$data) ? $data['nom'] : null;
        $surface = array_key_exists('surface',$data) ? $data['surface'] : null;
        $localisation = array_key_exists('localisation',$data) ? $data['localisation'] : null;
        $lat = array_key_exists('lat',$data) ? $data['lat'] : null;
        $lng = array_key_exists('lng',$data) ? $data['lng'] : null;
        $polygon = array_key_exists('polygon',$data) ? $data['polygon'] : null;

        $stmt = $conn->prepare("UPDATE parcelles SET nom=?, surface=?, localisation=?, lat=?, lng=?, polygon=? WHERE id=?");
        $stmt->bind_param("sddddsi", $nom, $surface, $localisation, $lat, $lng, $polygon, $id);

        if ($stmt->execute()) {
            echo json_encode(["status"=>"ok","message"=>"Parcelle mise à jour"]);
        } else {
            http_response_code(500);
            echo json_encode(["status"=>"error","message"=>"Erreur mise à jour"]);
        }
        exit;
    }

    // DELETE
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $id = $_GET['id'] ?? $data['id'] ?? null;
        if (!$id) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"id required"]); exit; }

        $stmt = $conn->prepare("DELETE FROM parcelles WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) echo json_encode(["status"=>"ok","message"=>"Parcelle supprimée"]);
            else { http_response_code(404); echo json_encode(["status"=>"error","message"=>"Parcelle non trouvée"]); }
        } else {
            http_response_code(500);
            echo json_encode(["status"=>"error","message"=>"Erreur suppression"]);
        }
        exit;
    }

    // Method not allowed
    http_response_code(405);
    echo json_encode(["status"=>"error","message"=>"Method not allowed"]);
    exit;
}

// ================== METEO (create & list) ==================
if ($action === 'meteo') {
    // GET: relevés d'une parcelle
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $parcelle_id = $_GET['parcelle_id'] ?? null;
        if (!$parcelle_id) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"parcelle_id required"]); exit; }

        $stmt = $conn->prepare("SELECT id, parcelle_id, temperature, humidite, pluie, vent, date_releve FROM meteo_data WHERE parcelle_id = ? ORDER BY date_releve DESC");
        $stmt->bind_param("i", $parcelle_id);
        $stmt->execute();
        $res = $stmt->get_result();
        $out = [];
        while ($row = $res->fetch_assoc()) $out[] = $row;
        echo json_encode($out);
        exit;
    }

    // POST: ajouter un relevé météo
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $parcelle_id = $data['parcelle_id'] ?? null;
        if (!$parcelle_id) { http_response_code(400); echo json_encode(["status"=>"error","message"=>"parcelle_id required"]); exit; }

        $temperature = isset($data['temperature']) ? $data['temperature'] : null;
        $humidite = isset($data['humidite']) ? $data['humidite'] : null;
        $pluie = isset($data['pluie']) ? $data['pluie'] : null;
        $vent = isset($data['vent']) ? $data['vent'] : null;
        $date_releve = $data['date_releve'] ?? null; // format YYYY-MM-DD HH:MM:SS or null for NOW

        $stmt = $conn->prepare("INSERT INTO meteo_data (parcelle_id, temperature, humidite, pluie, vent, date_releve) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("idddds", $parcelle_id, $temperature, $humidite, $pluie, $vent, $date_releve);

        if ($stmt->execute()) {
            $insertedId = $stmt->insert_id;
            $stmt2 = $conn->prepare("SELECT id, parcelle_id, temperature, humidite, pluie, vent, date_releve FROM meteo_data WHERE id = ?");
            $stmt2->bind_param("i", $insertedId);
            $stmt2->execute();
            $r = $stmt2->get_result()->fetch_assoc();
            echo json_encode(["status"=>"ok","meteo"=>$r]);
        } else {
            http_response_code(500);
            echo json_encode(["status"=>"error","message"=>"Erreur insertion meteo"]);
        }
        exit;
    }

    // Method not allowed for other verbs
    http_response_code(405);
    echo json_encode(["status"=>"error","message"=>"Method not allowed"]);
    exit;
}


// ================== ERROR ==================
http_response_code(400);
echo json_encode(["status"=>"error","message"=>"Invalid action"]);
exit;