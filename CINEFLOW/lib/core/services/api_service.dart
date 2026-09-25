import 'dart:convert';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

class ApiService {
  static const String _baseUrl = AppConfig.apiBaseUrl;

  static Future<Map<String, dynamic>> getJson(String path) async {
    final response = await http.get(Uri.parse('$_baseUrl$path'));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }

    throw Exception('Request failed: ${response.statusCode}');
  }

  static Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }

    throw Exception('Request failed: ${response.statusCode}');
  }
}
