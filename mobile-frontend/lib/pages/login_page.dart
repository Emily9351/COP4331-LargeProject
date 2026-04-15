import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart'; // Added for session storage
import './dashboard_page.dart'; // Ensure this matches your file path

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  _LoginPageState createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  Future<void> handleLogin() async {
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) return;

    try {
      final response = await http.post(
        Uri.parse('http://emilydensmore.com:5000/api/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // 🕵️ Aggressively search for the ID wherever the backend might hide it
        String uid = data['userId']?.toString() ??
                     data['id']?.toString() ??
                     data['_id']?.toString() ??
                     '';

        // If it's nested inside a "user" object (very common)
        if (uid.isEmpty && data['user'] != null) {
          uid = data['user']['_id']?.toString() ??
                data['user']['id']?.toString() ??
                '';
        }

        // Print to terminal so we can debug if it still fails
        debugPrint("📦 FULL SERVER RESPONSE: ${response.body}");
        debugPrint("🔑 EXTRACTED USER ID: $uid");

        // Save the ID and token locally
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('userId', uid);
        if (data['token'] != null) {
          await prefs.setString('authToken', data['token'].toString());
        }
        await prefs.setString('authToken', data['token']?.toString() ?? '');

        // Navigate to Dashboard
        if (mounted) {
          Navigator.pushNamed(context, '/dashboard');
        }
      } else {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? "Login Failed")),
        );
      }
    } catch (e) {
      debugPrint("Error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Connection Error. Is the server running?")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Image
          Positioned.fill(
            child: Image.asset(
              'assets/images/UpBackground.png',
              fit: BoxFit.cover,
            ),
          ),
          // Dark Overlay
          Positioned.fill(
            child: Container(color: Colors.black.withOpacity(0.5)),
          ),
          Center(
            child: SingleChildScrollView( // Added to prevent overflow on small screens
              child: Container(
                width: 350,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color.fromARGB(255, 0, 6, 22).withOpacity(0.9),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset('assets/images/UpIcon.png', height: 60),
                    const SizedBox(height: 16),
                    const Text(
                      "Adventure Awaits",
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 20),
                    TextField(
                      controller: emailController,
                      decoration: const InputDecoration(
                        labelText: "Email",
                        labelStyle: TextStyle(color: Colors.white70),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                      ),
                      style: const TextStyle(color: Colors.white),
                    ),
                    TextField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: "Password",
                        labelStyle: TextStyle(color: Colors.white70),
                        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white38)),
                      ),
                      style: const TextStyle(color: Colors.white),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: handleLogin,
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 45),
                        backgroundColor: Colors.blueAccent,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text("Sign In"),
                    ),
                    TextButton(
                      onPressed: () =>
                          Navigator.pushNamed(context, '/registration'),
                      child: const Text(
                        "Don't have an account? Create one",
                        style: TextStyle(color: Colors.white70),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
