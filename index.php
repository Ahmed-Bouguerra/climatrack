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
           
// ================== ERROR ==================
http_response_code(400);
echo json_encode(["status"=>"error","message"=>"Invalid action"]);
exit;