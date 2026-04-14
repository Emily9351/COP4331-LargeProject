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
  final String status; // "todo" | "in_progress" | "done"
  final String dueDate;
  final String priority;

  TaskModel({
    required this.id,
    required this.title,
    required this.status,
    required this.dueDate,
    required this.priority,
  });

  bool get isDone => status == "done";

  TaskModel copyWith({String? status}) => TaskModel(
        id: id,
        title: title,
        status: status ?? this.status,
        dueDate: dueDate,
        priority: priority,
      );

  factory TaskModel.fromJson(Map<String, dynamic> j) => TaskModel(
        id: j['_id'] ?? '',
        title: j['title'] ?? '',
        status: j['status'] ?? 'todo',
        dueDate: j['dueDate'] ?? '',
        priority: j['priority'] ?? 'medium',
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
// Badge definitions
// ─────────────────────────────────────────────

class BadgeType {
  final String id;
  final String name;
  final String icon;
  final String description;
  final int tasksRequired;

  const BadgeType({
    required this.id,
    required this.name,
    required this.icon,
    required this.description,
    required this.tasksRequired,
  });
}

const List<BadgeType> availableBadges = [
  BadgeType(id: 'starter',  name: 'Starter',  icon: '⭐', description: 'Complete your first task!',    tasksRequired: 1),
  BadgeType(id: 'achiever', name: 'Achiever', icon: '🔥', description: 'Complete 5 tasks in a week!',  tasksRequired: 5),
  BadgeType(id: 'champion', name: 'Champion', icon: '🏆', description: 'Complete 10 tasks in a week!', tasksRequired: 10),
  BadgeType(id: 'legend',   name: 'Legend',   icon: '💎', description: 'Complete 20 tasks in a week!', tasksRequired: 20),
];

// ─────────────────────────────────────────────
// API base URL — change to your server
// ─────────────────────────────────────────────

const String _baseUrl = 'https://emilydensmore.com';

// ─────────────────────────────────────────────
// Dashboard Page
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
  String _activeTab         = 'classes'; // 'classes' | 'groups'

  // Weekly gamification
  int _weeklyCount            = 0;
  List<String> _earnedBadgeIds = [];
  String? _toastMsg;

  @override
  void initState() {
    super.initState();
    _loadWeeklyData();
    _fetchAll();
  }

  // ── Persistence ──────────────────────────────

  Future<void> _loadWeeklyData() async {
    final prefs = await SharedPreferences.getInstance();
    final count  = prefs.getInt('weeklyCount') ?? 0;
    final badges = prefs.getStringList('earnedBadges') ?? [];
    final storedWeekStart = prefs.getString('weekStart');

    // Reset if new week
    final now       = DateTime.now();
    final weekStart = _getWeekStart(now);
    if (storedWeekStart == null ||
        DateTime.parse(storedWeekStart).isBefore(weekStart)) {
      await prefs.setInt('weeklyCount', 0);
      await prefs.setString('weekStart', weekStart.toIso8601String());
      setState(() { _weeklyCount = 0; });
    } else {
      setState(() {
        _weeklyCount     = count;
        _earnedBadgeIds  = badges;
      });
    }
  }

  DateTime _getWeekStart(DateTime d) {
    return DateTime(d.year, d.month, d.day - d.weekday % 7);
  }

  Future<void> _incrementBalloons() async {
    final prefs    = await SharedPreferences.getInstance();
    final newCount = _weeklyCount + 1;
    await prefs.setInt('weeklyCount', newCount);
    setState(() => _weeklyCount = newCount);

    // Check badge unlocks
    for (final badge in availableBadges) {
      if (!_earnedBadgeIds.contains(badge.id) && newCount >= badge.tasksRequired) {
        final updated = [..._earnedBadgeIds, badge.id];
        await prefs.setStringList('earnedBadges', updated);
        setState(() => _earnedBadgeIds = updated);
        _showToast('🎉 Badge Unlocked: ${badge.icon} ${badge.name}!');
        break;
      }
    }
  }

  void _showToast(String msg) {
    setState(() => _toastMsg = msg);
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) setState(() => _toastMsg = null);
    });
  }

  // ── API calls ────────────────────────────────

  Future<void> _fetchAll() async {
    final prefs  = await SharedPreferences.getInstance();
    final userId = prefs.getString('userId') ?? '';

    if (userId.isEmpty) {
      setState(() => _loading = false);
      return;
    }

    try {
      // Fetch classes
      final classRes = await http.get(Uri.parse('$_baseUrl/api/classes'));
      final classData = jsonDecode(classRes.body) as List;

      // Filter to this student's enrolled classes
      final userRes  = await http.get(Uri.parse('$_baseUrl/api/users/$userId'));
      final userData = jsonDecode(userRes.body);
      final enrolledIds = List<String>.from(
        (userData['enrolledClasses'] ?? []).map((c) => c is Map ? c['_id'] : c),
      );

      final myClasses = classData
          .where((c) => enrolledIds.contains(c['_id']))
          .map((c) => ClassModel.fromJson(c))
          .toList();

      // Fetch tasks per class
      for (final cls in myClasses) {
        final taskRes  = await http.get(
          Uri.parse('$_baseUrl/api/tasks?classId=${cls.id}'),
        );
        final taskData = jsonDecode(taskRes.body) as List;
        cls.tasks      = taskData.map((t) => TaskModel.fromJson(t)).toList();
      }

      // Fetch groups
      final groupRes  = await http.get(Uri.parse('$_baseUrl/api/groups'));
      final groupData = jsonDecode(groupRes.body) as List;
      final myGroups  = groupData
          .where((g) => (g['memberIds'] as List).contains(userId))
          .map((g) => GroupModel.fromJson(g))
          .toList();

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

  Future<void> _toggleTask(String classId, String taskId, bool isDone) async {
    // Optimistic UI
    setState(() {
      _classes = _classes.map((cls) {
        if (cls.id != classId) return cls;
        cls.tasks = cls.tasks.map((t) {
          if (t.id != taskId) return t;
          return t.copyWith(status: isDone ? 'todo' : 'done');
        }).toList();
        return cls;
      }).toList();
    });

    if (!isDone) await _incrementBalloons();

    // Sync backend
    final task = _classes
        .firstWhere((c) => c.id == classId)
        .tasks
        .firstWhere((t) => t.id == taskId);

    await http.put(
      Uri.parse('$_baseUrl/api/tasks/$taskId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'status': task.status}),
    );
  }

  Future<void> _addTask(String classId, String title, String dueDate) async {
    final prefs  = await SharedPreferences.getInstance();
    final userId = prefs.getString('userId') ?? '';

    final res = await http.post(
      Uri.parse('$_baseUrl/api/tasks'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'title': title,
        'dueDate': dueDate,
        'assignedTo': userId,
        'classId': classId,
      }),
    );

    if (res.statusCode == 201) {
      final newTask = TaskModel.fromJson(jsonDecode(res.body));
      setState(() {
        _classes = _classes.map((cls) {
          if (cls.id != classId) return cls;
          cls.tasks = [...cls.tasks, newTask];
          return cls;
        }).toList();
      });
    }
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    if (mounted) Navigator.pushReplacementNamed(context, '/');
  }

  // ── Stats ─────────────────────────────────────

  int get _totalTasks     => _classes.fold(0, (a, c) => a + c.tasks.length);
  int get _completedTasks => _classes.fold(0, (a, c) => a + c.tasks.where((t) => t.isDone).length);

  // ─────────────────────────────────────────────
  // Build
  // ─────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [

          // ── Background ──
          Positioned.fill(
            child: Image.asset(
              'assets/images/UpBackground.png',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(color: Colors.black.withOpacity(0.5)),
          ),

          // ── Main content ──
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

          // ── Toast ──
          if (_toastMsg != null)
            Positioned(
              bottom: 24,
              right: 24,
              left: 24,
              child: _buildToast(_toastMsg!),
            ),
        ],
      ),
    );
  }

  // ── Navbar ────────────────────────────────────

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
              gradient: const LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('TaskMaster', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black)),
              Text('Student Dashboard', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
          const Spacer(),
          TextButton(
            onPressed: _logout,
            style: TextButton.styleFrom(
              backgroundColor: Colors.white,
              side: const BorderSide(color: Colors.grey),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            child: const Text('Logout', style: TextStyle(color: Colors.black)),
          ),
        ],
      ),
    );
  }

  // ── Content ───────────────────────────────────

  Widget _buildContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top cards row
          _buildTopCards(),
          const SizedBox(height: 16),

          // Stats row
          _buildStatsRow(),
          const SizedBox(height: 16),

          // Tabs
          _buildTabs(),
          const SizedBox(height: 12),

          // Tab content
          _activeTab == 'classes' ? _buildClassesTab() : _buildGroupsTab(),
        ],
      ),
    );
  }

  // ── Top cards ─────────────────────────────────

  Widget _buildTopCards() {
    return LayoutBuilder(builder: (ctx, constraints) {
      final wide = constraints.maxWidth > 600;
      final cards = [
        _buildHouseCard(),
        _buildBadgeCard(),
      ];
      return wide
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: cards[0]),
              const SizedBox(width: 16),
              Expanded(child: cards[1]),
            ])
          : Column(children: [cards[0], const SizedBox(height: 16), cards[1]]);
    });
  }

  Widget _buildHouseCard() {
    final balloonCount = _weeklyCount.clamp(0, 20);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFE0F2FE), Color(0xFFEFF6FF), Color(0xFFE0E7FF)],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE), width: 2),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          const Text('Weekly Progress Adventure', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black)),
          const SizedBox(height: 4),
          const Text('Complete tasks to add balloons! Resets every Sunday.', style: TextStyle(fontSize: 12, color: Color(0xFF4B5563)), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          // Balloons
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 6, runSpacing: 6,
            children: List.generate(balloonCount, (i) {
              final hue = (i * 47) % 360;
              return Container(
                width: 28, height: 34,
                decoration: BoxDecoration(
                  color: HSVColor.fromAHSV(1, hue.toDouble(), 0.7, 0.8).toColor(),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(14), topRight: Radius.circular(14),
                    bottomLeft: Radius.circular(14), bottomRight: Radius.circular(8),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 12),
          const Text('🏠', style: TextStyle(fontSize: 64)),
          const SizedBox(height: 8),
          Text(
            '🎈 $_weeklyCount balloon${_weeklyCount != 1 ? "s" : ""} this week',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
          ),
        ],
      ),
    );
  }

  Widget _buildBadgeCard() {
    final nextBadge = availableBadges.firstWhere(
      (b) => !_earnedBadgeIds.contains(b.id),
      orElse: () => availableBadges.last,
    );
    final allEarned = _earnedBadgeIds.length >= availableBadges.length;
    final progress  = allEarned ? 1.0 : (_weeklyCount / nextBadge.tasksRequired).clamp(0.0, 1.0);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.97),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFCD34D), width: 2),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [Color(0xFFFFFBEB), Color(0xFFFEFCE8)]),
              borderRadius: BorderRadius.vertical(top: Radius.circular(10)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('🏅', style: TextStyle(fontSize: 20)),
                SizedBox(width: 8),
                Text('Achievement Badges', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black)),
              ],
            ),
          ),

          // Progress box
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEFCE8),
              border: Border.all(color: const Color(0xFFFDE68A)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("This week's progress", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF92400E))),
                    Text('$_weeklyCount 🎈', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF92400E))),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  allEarned ? 'All badges earned!' : 'Next: ${nextBadge.name} — $_weeklyCount/${nextBadge.tasksRequired}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFFA16207)),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: const Color(0xFFFDE68A),
                    valueColor: const AlwaysStoppedAnimation(Color(0xFFF59E0B)),
                  ),
                ),
              ],
            ),
          ),

          // Scout sash body
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF7C3F00),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                const Text('Wilderness Explorer Sash', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFFFEF3C7))),
                const SizedBox(height: 4),
                Text('${_earnedBadgeIds.length} badge${_earnedBadgeIds.length != 1 ? "s" : ""} earned', style: const TextStyle(fontSize: 12, color: Color(0xFFFCD34D))),
                const SizedBox(height: 12),
                _earnedBadgeIds.isEmpty
                    ? Column(children: const [
                        Text('🎯', style: TextStyle(fontSize: 36)),
                        SizedBox(height: 6),
                        Text('Complete tasks to earn your first badge!', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFFFEF3C7)), textAlign: TextAlign.center),
                      ])
                    : Wrap(
                        spacing: 8, runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: availableBadges
                            .where((b) => _earnedBadgeIds.contains(b.id))
                            .map((b) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.15),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Column(children: [
                                    Text(b.icon, style: const TextStyle(fontSize: 26)),
                                    Text(b.name, style: const TextStyle(fontSize: 10, color: Color(0xFFFEF3C7))),
                                  ]),
                                ))
                            .toList(),
                      ),
              ],
            ),
          ),

          // Available badges
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE5E7EB)),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                const Text('Available Badges', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: availableBadges.map((b) {
                    final unlocked = _earnedBadgeIds.contains(b.id);
                    return Opacity(
                      opacity: unlocked ? 1.0 : 0.5,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        decoration: BoxDecoration(
                          color: unlocked ? const Color(0xFFFFFBEB) : const Color(0xFFF9FAFB),
                          border: Border.all(color: unlocked ? const Color(0xFFFCD34D) : const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(children: [
                          Text(b.icon, style: const TextStyle(fontSize: 20)),
                          Text(b.name, style: const TextStyle(fontSize: 10, color: Color(0xFF374151))),
                          Text('${b.tasksRequired}t', style: const TextStyle(fontSize: 9, color: Color(0xFF6B7280))),
                        ]),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Stats row ─────────────────────────────────

  Widget _buildStatsRow() {
    final stats = [
      {'label': 'Total Classes',  'value': '${_classes.length}',    'icon': '📚', 'color': const Color(0xFFDBEAFE)},
      {'label': 'Student Groups', 'value': '${_groups.length}',     'icon': '👥', 'color': const Color(0xFFF3E8FF)},
      {'label': 'Total Tasks',    'value': '$_totalTasks',           'icon': '⏰', 'color': const Color(0xFFDCFCE7)},
      {'label': 'Completed',      'value': '$_completedTasks',       'icon': '✅', 'color': const Color(0xFFFFEDD5)},
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
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(s['label'] as String, style: const TextStyle(fontSize: 11, color: Color(0xFF4B5563))),
              Text(s['value'] as String, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.black)),
            ]),
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: s['color'] as Color, borderRadius: BorderRadius.circular(8)),
              child: Center(child: Text(s['icon'] as String, style: const TextStyle(fontSize: 18))),
            ),
          ],
        ),
      )).toList(),
    );
  }

  // ── Tabs ──────────────────────────────────────

  Widget _buildTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _tabButton('📚 Classes', 'classes'),
          _tabButton('👥 Student Groups', 'groups'),
        ],
      ),
    );
  }

  Widget _tabButton(String label, String tab) {
    final active = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF2563EB) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14, fontWeight: FontWeight.w500,
            color: active ? Colors.white : const Color(0xFF4B5563),
          ),
        ),
      ),
    );
  }

  // ── Classes tab ───────────────────────────────

  Widget _buildClassesTab() {
    if (_classes.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(32),
        child: Text('No classes enrolled.', style: TextStyle(color: Colors.white70)),
      ));
    }
    return Column(
      children: _classes.map((cls) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _buildClassCard(cls),
      )).toList(),
    );
  }

  Widget _buildClassCard(ClassModel cls) {
    final completed = cls.tasks.where((t) => t.isDone).length;
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.97),
        borderRadius: BorderRadius.circular(10),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 12, 10),
            child: Row(
              children: [
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${cls.courseCode} — ${cls.title}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black)),
                    Text('$completed/${cls.tasks.length} tasks complete', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                  ],
                )),
                // Add task button
                GestureDetector(
                  onTap: () => _showAddTaskDialog(cls.id),
                  child: Container(
                    width: 28, height: 28,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFD1D5DB)),
                    ),
                    child: const Icon(Icons.add, size: 16, color: Color(0xFF6B7280)),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFF3F4F6)),
          // Tasks
          ...cls.tasks.map((task) => _buildTaskItem(
            task,
            onTap: () => _toggleTask(cls.id, task.id, task.isDone),
          )),
          if (cls.tasks.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('No tasks yet.', style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 13)),
            ),
        ],
      ),
    );
  }

  Widget _buildTaskItem(TaskModel task, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Checkbox(
              value: task.isDone,
              onChanged: (_) => onTap(),
              activeColor: const Color(0xFF2563EB),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
            const SizedBox(width: 8),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  style: TextStyle(
                    fontSize: 14,
                    color: task.isDone ? const Color(0xFF9CA3AF) : Colors.black,
                    decoration: task.isDone ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (task.dueDate.isNotEmpty)
                  Text('Due: ${task.dueDate}', style: const TextStyle(fontSize: 11, color: Color(0xFF9CA3AF))),
              ],
            )),
          ],
        ),
      ),
    );
  }

  // ── Groups tab ────────────────────────────────

  Widget _buildGroupsTab() {
    if (_groups.isEmpty) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(32),
        child: Text('No groups joined.', style: TextStyle(color: Colors.white70)),
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
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Row(
            children: [
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(g.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black)),
                  Text('${g.memberIds.length} members · ${g.description}', style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
                ],
              )),
              const Icon(Icons.group, color: Color(0xFF6B7280)),
            ],
          ),
        ),
      )).toList(),
    );
  }

  // ── Add task dialog ───────────────────────────

  void _showAddTaskDialog(String classId) {
    String title   = '';
    String dueDate = '';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: const Text('Add New Task', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Task title',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onChanged: (v) => title = v,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(
                hintText: 'Due date (YYYY-MM-DD)',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onChanged: (v) => dueDate = v,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              if (title.trim().isNotEmpty) _addTask(classId, title.trim(), dueDate);
            },
            child: const Text('Add Task'),
          ),
        ],
      ),
    );
  }

  // ── Toast ─────────────────────────────────────

  Widget _buildToast(String msg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(8),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Text(msg, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
    );
  }
}