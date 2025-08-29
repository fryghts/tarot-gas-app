<?php
// gemini-proxy.php

// 1. Устанавливаем заголовки для CORS (чтобы ваш сайт мог обращаться к этому скрипту)
header("Access-Control-Allow-Origin: *"); // В продакшене лучше указать ваш домен вместо *
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 2. Убеждаемся, что запрос пришел методом POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Invalid request method.']);
    exit;
}

// 3. Получаем данные из фронтенда
$data = json_decode(file_get_contents("php://input"));

// Проверяем, что промпт был передан
if (!isset($data->prompt)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Prompt is missing.']);
    exit;
}

// 4. ВАШ СЕКРЕТНЫЙ КЛЮЧ GEMINI API
// Храните его здесь, на сервере. Никогда не передавайте его на фронтенд.
$apiKey = 'AIzaSyBHGs5hhQuDaYk8ArzSAY-tUGe3LuC6wD0'; // <-- ЗАМЕНИТЕ НА ВАШ КЛЮЧ

// 5. Формируем тело запроса для Google API
$postData = [
    'contents' => [
        [
            'parts' => [
                ['text' => $data->prompt]
            ]
        ]
    ]
];

// 6. Отправляем запрос к Google Gemini API с помощью cURL
$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' . $apiKey;

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 7. Отправляем ответ от Google обратно на ваш фронтенд
http_response_code($httpcode);
echo $response;

?>