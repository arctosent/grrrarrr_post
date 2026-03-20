<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Allow: GET, POST, OPTIONS');
    http_response_code(204);
    exit;
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'GET' && $method !== 'POST') {
    respond(['error' => 'Method not allowed'], 405);
}

$storageDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
$storageFile = $storageDir . DIRECTORY_SEPARATOR . 'site_state.json';

if (!is_dir($storageDir) && !mkdir($storageDir, 0775, true) && !is_dir($storageDir)) {
    respond(['error' => 'Storage directory is not writable'], 500);
}

$handle = fopen($storageFile, 'c+');
if ($handle === false) {
    respond(['error' => 'Unable to open storage file'], 500);
}

if (!flock($handle, LOCK_EX)) {
    fclose($handle);
    respond(['error' => 'Unable to lock storage file'], 500);
}

try {
    $state = readStateFromHandle($handle);

    if ($method === 'POST') {
        $rawBody = file_get_contents('php://input');
        $payload = json_decode($rawBody ?: 'null', true);

        if (!is_array($payload)) {
            respondWithHandle($handle, ['error' => 'Invalid JSON payload'], 400);
        }

        if (array_key_exists('posts', $payload)) {
            $state['posts'] = normalizePosts($payload['posts']);
        }

        if (array_key_exists('followers', $payload)) {
            $state['followers'] = normalizeFollowers($payload['followers']);
        }

        $state['revision'] = (int)($state['revision'] ?? 0) + 1;
        $state['updatedAt'] = gmdate('c');

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        fflush($handle);
    }

    respondWithHandle($handle, $state, 200);
} catch (Throwable $error) {
    respondWithHandle($handle, ['error' => 'Server error', 'detail' => $error->getMessage()], 500);
}

function readStateFromHandle($handle): array
{
    rewind($handle);
    $raw = stream_get_contents($handle);

    if (!is_string($raw) || trim($raw) === '') {
        return defaultState();
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return defaultState();
    }

    $state = defaultState();
    $state['posts'] = normalizePosts($decoded['posts'] ?? []);
    $state['followers'] = normalizeFollowers($decoded['followers'] ?? []);
    $state['revision'] = max(0, (int)($decoded['revision'] ?? 0));
    $state['updatedAt'] = normalizeIsoDate($decoded['updatedAt'] ?? null);
    return $state;
}

function defaultState(): array
{
    return [
        'posts' => [],
        'followers' => [],
        'revision' => 0,
        'updatedAt' => gmdate('c')
    ];
}

function normalizePosts($value): array
{
    if (!is_array($value)) {
        return [];
    }

    $posts = [];
    $maxPosts = 1200;
    foreach (array_slice(array_values($value), 0, $maxPosts) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $id = normalizeString($item['id'] ?? ('post-' . time() . '-' . $index), 120);
        $statusId = normalizeStatusId($item['statusId'] ?? ($item['status'] ?? $id));

        $comments = [];
        if (isset($item['comments']) && is_array($item['comments'])) {
            foreach (array_slice(array_values($item['comments']), 0, 500) as $cIndex => $comment) {
                if (!is_array($comment)) {
                    continue;
                }
                $comments[] = [
                    'id' => normalizeString($comment['id'] ?? ('comment-' . $index . '-' . $cIndex), 120),
                    'author' => normalizeString($comment['author'] ?? 'Visitante', 140),
                    'text' => normalizeString($comment['text'] ?? '', 4000),
                    'avatar' => normalizeString($comment['avatar'] ?? '', 220000),
                    'createdAt' => normalizeIsoDate($comment['createdAt'] ?? null)
                ];
            }
        }

        $posts[] = [
            'id' => $id,
            'statusId' => $statusId,
            'text' => normalizeString($item['text'] ?? '', 12000),
            'media' => normalizeString($item['media'] ?? '', 2400000),
            'favoriteCount' => max(0, (int)($item['favoriteCount'] ?? 0)),
            'comments' => $comments,
            'createdAt' => normalizeIsoDate($item['createdAt'] ?? null)
        ];
    }

    usort($posts, static function (array $a, array $b): int {
        return strtotime($b['createdAt']) <=> strtotime($a['createdAt']);
    });

    return $posts;
}

function normalizeFollowers($value): array
{
    if (!is_array($value)) {
        return [];
    }

    $set = [];
    foreach (array_slice(array_values($value), 0, 50000) as $item) {
        $username = strtolower(normalizeString($item, 80));
        if ($username === '') {
            continue;
        }
        $set[$username] = true;
    }

    $followers = array_keys($set);
    sort($followers);
    return $followers;
}

function normalizeStatusId($value): string
{
    $digits = preg_replace('/\D+/', '', (string)$value);
    if ($digits === null || strlen($digits) < 8) {
        $digits = (string)(time()) . (string)random_int(100000, 999999);
    }
    return substr($digits, 0, 24);
}

function normalizeString($value, int $maxLength): string
{
    $text = trim((string)$value);
    if (strlen($text) > $maxLength) {
        return substr($text, 0, $maxLength);
    }
    return $text;
}

function normalizeIsoDate($value): string
{
    if (is_string($value) && trim($value) !== '') {
        $timestamp = strtotime($value);
        if ($timestamp !== false) {
            return gmdate('c', $timestamp);
        }
    }
    return gmdate('c');
}

function respond(array $payload, int $status): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respondWithHandle($handle, array $payload, int $status): void
{
    flock($handle, LOCK_UN);
    fclose($handle);
    respond($payload, $status);
}
