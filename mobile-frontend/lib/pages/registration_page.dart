import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class RegistrationPage extends StatefulWidget {
  @override
  _RegistrationPageState createState() => _RegistrationPageState();
}

class _RegistrationPageState extends State<RegistrationPage> {
  final firstNameController = TextEditingController();
  final lastNameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  Future<void> handleRegistration() async {
    final firstName = firstNameController.text.trim();
    final lastName = lastNameController.text.trim();
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    if (firstName.isEmpty || lastName.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please fill in all fields")),
      );
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('http://emilydensmore.com:5000/api/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': '$firstName $lastName',
          'email': email,
          'password': password,
          'role': 'student',
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final userId = data['_id'] ?? data['id'] ?? '';

        if (userId.isNotEmpty) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('userId', userId);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Account created!")),
          );
          Navigator.pushReplacementNamed(context, '/dashboard');
        }
      } else {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? "Registration Failed")),
        );
      }
    } catch (e) {
      debugPrint("Error: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Connection Error")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 🌄 Background Image
          Positioned.fill(
            child: Image.asset(
              'assets/images/UpBackground.png',
              fit: BoxFit.cover, // same as background-size: cover
            ),
          ),

          // 🌑 Overlay
          Positioned.fill(
            child: Container(
              color: Colors.black.withOpacity(0.5),
            ),
          ),

          // 📦 Login Card
          Center(
            child: Container(
              width: 350,
              padding: EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color.fromARGB(255, 0, 6, 22).withOpacity(0.9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 🏠 Icon
                  Image.asset(
                    'assets/images/UpIcon.png',
                    height: 60,
                  ),

                  SizedBox(height: 16),

                  Text(
                    "Adventure Awaits",
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: const Color.fromARGB(255, 255, 255, 255)
                    ),
                  ),

                  Text(
                    "Reach New Heights One Task at a Time",
                    style: TextStyle(
                      color: const Color.fromARGB(255, 139, 149, 206),
                      fontWeight: FontWeight.w500
                    ),
                  ),

                  SizedBox(height: 20),

                  TextField(
                    controller: firstNameController,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.account_circle, color: const Color.fromARGB(179, 151, 184, 255)),
                      labelText: "First Name",
                      labelStyle: TextStyle(color: Colors.white70),
                    ),
                    style: TextStyle(
                      color: Colors.white
                    )
                  ),

                  TextField(
                    controller: lastNameController,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.account_circle, color: const Color.fromARGB(179, 151, 184, 255)),
                      labelText: "Last Name",
                      labelStyle: TextStyle(color: Colors.white70),
                    ),
                    style: TextStyle(
                      color: Colors.white
                    )
                  ),

                  // 📧 Email
                  TextField(
                    controller: emailController,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.email, color: const Color.fromARGB(179, 151, 184, 255)),
                      labelText: "Email",
                      labelStyle: TextStyle(color: Colors.white70),
                    ),
                    style: TextStyle(
                      color: Colors.white
                    )
                  ),

                  SizedBox(height: 12),

                  // 🔒 Password
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.lock, color: const Color.fromARGB(179, 151, 184, 255)),
                      labelText: "Password",
                      labelStyle: TextStyle(color: Colors.white70),
                    ),
                  ),

                  SizedBox(height: 20),

                  // 🔘 Button
                  ElevatedButton(
                    onPressed: handleRegistration,
                    style: ElevatedButton.styleFrom(
                      minimumSize: Size(double.infinity, 45),
                      foregroundColor: const Color.fromARGB(255, 0, 9, 88),
                    ),
                    child: Text(
                      "Create Account",
                      style: TextStyle(
                        fontWeight: FontWeight.w600
                      )
                      ),
                  ),

                  SizedBox(height: 12),

                  TextButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/');
                    },
                    child: Text("Already have an account? Sign In"),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}