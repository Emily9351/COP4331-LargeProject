import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// ─────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────

class TaskModel {
  final String id;
  final String title;
  final String status; 
  final String dueDate;

  TaskModel({
    required this.id,
    required this.title,
    required this.status,
    required this.dueDate,
  });

  bool get isDone => status == "done";

  factory TaskModel.fromJson(Map<String, dynamic> j) => TaskModel(
        id: j['_id'] ?? '',
        title: j['title'] ?? '',
        status: j['status'] ?? 'todo',
        dueDate: j['dueDate'] ?? '',
      );
}

class ClassModel {
  final String id;
  final String title;
  final String courseCode;
  List<TaskModel> tasks;

  ClassModel({
    required this.id,
    required this.title,
    required this.courseCode,
    required this.tasks,
  });

  factory ClassModel.fromJson(Map<String, dynamic> j) => ClassModel(
        id: j['_id'] ?? '',
        title: j['title'] ?? '',
        courseCode: j['courseCode'] ?? '',
        tasks: [],
      );
}

class GroupModel {
  final String id;
  final String name;
  final String description;
  final List<String> memberIds;

  GroupModel({
    required this.id,
    required this.name,
    required this.description,
    required this.memberIds,
  });

  factory GroupModel.fromJson(Map<String, dynamic> j) => GroupModel(
        id: j['_id'] ?? '',
        name: j['name'] ?? '',
        description: j['description'] ?? '',
        memberIds: List<String>.from(j['memberIds'] ?? []),
      );
}

// ─────────────────────────────────────────────
// API base URL
// ─────────────────────────────────────────────
const String _baseUrl = 'http://emilydensmore.com:5000';

// ─────────────────────────────────────────────
// Dashboard Page (Read-Only)
// ─────────────────────────────────────────────

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  List<ClassModel> _classes = [];
  List<GroupModel> _groups  = [];
  bool _loading             = true;
  String _activeTab         = 'classes'; 

  @override
  void initState() {
    super.initState();
    _fetchDatabaseStatus();
  }

  // ── Read-Only API Fetch ──────────────────────

  Future<void> _fetchDatabaseStatus() async {
    final prefs  = await SharedPreferences.getInstance();
    final userId = prefs.getString('userId') ?? '';
    final authToken = prefs.getString('authToken') ?? '';

    if (userId.isEmpty || authToken.isEmpty) {
      setState(() => _loading = false);
      return;
    }

    final headers = {'Authorization': 'Bearer $authToken'};

    try {
      // 1. Fetch classes for this student
      final classRes = await http.get(Uri.parse('$_baseUrl/api/classes?userId=$userId'));
      final classData = jsonDecode(classRes.body) as List;

    
      final myClasses = classData.map((c) => ClassModel.fromJson(c)).toList();

      // 2. Fetch tasks for each class
      for (final cls in myClasses) {
        final taskRes  = await http.get(
          Uri.parse('$_baseUrl/api/tasks?userId=$userId&classId=${cls.id}&studyGroupId=null&isHidden=all'),
          headers: headers,
        );
        final taskData = jsonDecode(taskRes.body) as List;
        cls.tasks      = taskData.map((t) => TaskModel.fromJson(t)).toList();
      }

      // 3. Fetch user's groups
      final groupRes  = await http.get(Uri.parse('$_baseUrl/api/groups?userId=$userId'), headers: headers);
      final groupData = jsonDecode(groupRes.body) as List;
      final myGroups  = groupData.map((g) => GroupModel.fromJson(g)).toList();

      setState(() {
        _classes = myClasses;
        _groups  = myGroups;
        _loading = false;
      });
    } catch (e) {
      debugPrint('Fetch error: $e');
      setState(() => _loading = false);
    }
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (mounted) Navigator.pushReplacementNamed(context, '/');
  }

  int get _totalTasks     => _classes.fold(0, (a, c) => a + c.tasks.length);
  int get _completedTasks => _classes.fold(0, (a, c) => a + c.tasks.where((t) => t.isDone).length);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.asset('assets/images/UpBackground.png', fit: BoxFit.cover),
          ),
          Positioned.fill(
            child: Container(color: Colors.black.withOpacity(0.5)),
          ),
          SafeArea(
            child: Column(
              children: [
                _buildNavbar(),
                Expanded(
                  child: _loading
                      ? const Center(child: CircularProgressIndicator(color: Colors.white))
                      : _buildContent(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavbar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      color: Colors.white,
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: const Color(0xFF2563EB),
            ),
            child: const Icon(Icons.cloud_sync, color: Colors.white),
          ),
          const SizedBox(width: 12),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Web DB Viewer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black)),
              Text('Read-Only Mode', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
          const Spacer(),
          TextButton(
            onPressed: _logout,
            style: TextButton.styleFrom(
              backgroundColor: Colors.white,
              side: const BorderSide(color: Colors.grey),
            ),
            child: const Text('Logout', style: TextStyle(color: Colors.black)),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStatsRow(),
          const SizedBox(height: 24),
          _buildTabs(),
          const SizedBox(height: 12),
          _activeTab == 'classes' ? _buildClassesTab() : _buildGroupsTab(),
        ],
      ),
    );
  }

  Widget _buildStatsRow() {
    final stats = [
      {'label': 'Enrolled Classes', 'value': '${_classes.length}', 'icon': '📚', 'color': const Color(0xFFDBEAFE)},
      {'label': 'Joined Groups',    'value': '${_groups.length}',  'icon': '👥', 'color': const Color(0xFFF3E8FF)},
      {'label': 'Total Tasks',      'value': '$_totalTasks',       'icon': '📋', 'color': const Color(0xFFDCFCE7)},
      {'label': 'Completed Tasks',  'value': '$_completedTasks',   'icon': '✅', 'color': const Color(0xFFFFEDD5)},
    ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 2.2,
      children: stats.map((s) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.97),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(s['label'] as String, style: const TextStyle(fontSize: 11, color: Color(0xFF4B5563))),
              Text(s['value'] as String, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.black)),
            ]),
            Text(s['icon'] as String, style: const TextStyle(fontSize: 24)),
          ],
        ),
      )).toList(),
    );
  }

  Widget _buildTabs() {
    return Row(
      children: [
        _tabButton('📚 Class Tasks', 'classes'),
        const SizedBox(width: 8),
        _tabButton('👥 My Groups', 'groups'),
      ],
    );
  }

  Widget _tabButton(String label, String tab) {
    final active = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.9),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w500,
            color: active ? Colors.white : Colors.black,
          ),
        ),
      ),
    );
  }

  Widget _buildClassesTab() {
    if (_classes.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(32),
        child: Text('No classes found in the database.', style: TextStyle(color: Colors.white70)),
      ));
    }
    return Column(
      children: _classes.map((cls) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.97),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text('${cls.courseCode} — ${cls.title}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
              const Divider(height: 1, color: Color(0xFFF3F4F6)),
              ...cls.tasks.map((task) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    // READ-ONLY Checkbox
                    Checkbox(
                      value: task.isDone,
                      onChanged: null, // Disabled interaction
                      fillColor: WidgetStateProperty.resolveWith((states) {
                        if (states.contains(WidgetState.disabled) && task.isDone) {
                          return const Color(0xFF2563EB); // Keep it blue when checked
                        }
                        return Colors.grey.shade300;
                      }),
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          task.title,
                          style: TextStyle(
                            fontSize: 14,
                            color: task.isDone ? Colors.grey : Colors.black,
                            decoration: task.isDone ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        if (task.dueDate.isNotEmpty)
                          Text('Due: ${task.dueDate}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    )),
                  ],
                ),
              )),
              if (cls.tasks.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No tasks created on web yet.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                ),
            ],
          ),
        ),
      )).toList(),
    );
  }

  Widget _buildGroupsTab() {
    if (_groups.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(32),
        child: Text('No groups found.', style: TextStyle(color: Colors.white70)),
      ));
    }
    return Column(
      children: _groups.map((g) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.97),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(g.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black)),
              const SizedBox(height: 4),
              Text('${g.memberIds.length} members · ${g.description}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      )).toList(),
    );
  }
}
