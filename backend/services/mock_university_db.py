# Stand-in for a real university student registry, which isn't available
# during development. Maps a student ID to a name/email the same way a real
# registry lookup would. None of these IDs correspond to actual UIU
# students - they're demo data for the "found ID card, owner never signed
# up for Find-X" path (services/id_owner_notifier.py).
MOCK_UNIVERSITY_DB = {
    "011201001": {"name": "Tanvir Ahsan", "email": "tanvir.ahsan.demo@uiu.ac.bd"},
    "011201002": {"name": "Farzana Islam", "email": "farzana.islam.demo@uiu.ac.bd"},
    "011201003": {"name": "Mahmudul Karim", "email": "mahmudul.karim.demo@uiu.ac.bd"},
    "011201004": {"name": "Sadia Rahman", "email": "sadia.rahman.demo@uiu.ac.bd"},
    "011201005": {"name": "Rakibul Hasan", "email": "rakibul.hasan.demo@uiu.ac.bd"},
    "011201006": {"name": "Nusrat Jahan", "email": "nusrat.jahan.demo@uiu.ac.bd"},
    "011201007": {"name": "Imtiaz Chowdhury", "email": "imtiaz.chowdhury.demo@uiu.ac.bd"},
    "011201008": {"name": "Tahmina Akter", "email": "tahmina.akter.demo@uiu.ac.bd"},
    "011201009": {"name": "Shahriar Kabir", "email": "shahriar.kabir.demo@uiu.ac.bd"},
    "011201010": {"name": "Rummana Haque", "email": "rummana.haque.demo@uiu.ac.bd"},
}


def lookup_student(student_id: str) -> dict | None:
    """Looks up a student ID in the mock registry. Returns None if not
    found - the caller (id_owner_notifier) treats that as "can't reach this
    person at all", the same as a real registry miss would."""
    return MOCK_UNIVERSITY_DB.get(student_id)
