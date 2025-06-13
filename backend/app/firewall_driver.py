class FirewallDriver:
    """
    Ortak (base) bir firewall sürücü sınıfı.
    Windows veya Linux alt sınıflar bunu miras alarak
    add_rule, remove_rule, update_rule metodlarını uygular.
    """
    def add_rule(self, rule):
        raise NotImplementedError

    def remove_rule(self, rule_name):
        raise NotImplementedError

    def update_rule(self, old_rule, new_rule):
        raise NotImplementedError
