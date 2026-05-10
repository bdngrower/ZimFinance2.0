                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 lg:p-6 pb-20 lg:pb-6 relative z-10 custom-scrollbar">
          {activeView !== 'settings' && (
            loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
              
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
                {[
                  { label: 'Receita Mensal', value: totals.totalIncome, icon: TrendingUp, color: 'emerald', sub: null },
                  { label: 'Gastos Mensal', value: totals.totalExpenses, icon: TrendingDown, color: 'rose', sub: null },
                  { label: 'Saldo Pgto', value: totals.remainingPagamento, icon: DollarSign, color: totals.remainingPagamento >= 0 ? 'emerald' : 'rose', sub: `Rec: ${formatCurrency(totals.totalPagamentoIncome)}` },
                  { label: 'Saldo Adto', value: totals.remainingVale, icon: Wallet, color: totals.remainingVale >= 0 ? 'indigo' : 'rose', sub: `Rec: ${formatCurrency(totals.totalValeIncome)}` },
                  { label: 'Saldo Total', value: totals.totalRemaining, icon: DollarSign, color: totals.totalRemaining >= 0 ? 'emerald' : 'rose', sub: null },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  const colorMap: Record<string, string> = {
                    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                  };
                  const colors = colorMap[card.color] || colorMap.emerald;
                  const textColor = card.color === 'rose' ? 'text-rose-400' : card.color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400';
                  return (
                    <div key={idx} className={`${idx === 4 ? 'col-span-2 lg:col-span-1' : ''} bg-white/5 backdrop-blur-xl rounded-xl lg:rounded-2xl border border-white/10 p-3 lg:p-4 hover:border-white/20 transition-all group`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{card.label}</span>
                        <div className={`p-1.5 rounded-lg border ${colors}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </div>
                      <p className={`text-base lg:text-xl font-extrabold font-mono tracking-tight ${textColor}`}>{formatCurrency(card.value)}</p>
                      {card.sub && <p className="text-[10px] text-white/30 font-mono mt-1">{card.sub}</p>}
                    </div>
                  );
                })}
              </div>

              {activeView === 'dashboard' ? (
                /* Annual Stats & Charts */
                <div className="space-y-4">
                  {/* Annual summary strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-3">
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between">
                      <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Receita Anual</span>
                      <span className="text-xs lg:text-sm font-mono font-bold text-emerald-400">{formatCurrency(annualTotals.income)}</span>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between">
                      <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Gasto Anual</span>
                      <span className="text-xs lg:text-sm font-mono font-bold text-rose-400">{formatCurrency(annualTotals.expense)}</span>
                    </div>
                    <div className={`${(annualTotals as any).balance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 flex items-center justify-between`}>
                      <span className="text-[9px] lg:text-[10px] font-bold text-white/40 uppercase tracking-widest">Projeção Anual</span>
                      <span className={`text-xs lg:text-sm font-mono font-bold ${(annualTotals as any).balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency((annualTotals as any).balance || 0)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col shadow-xl">
                      <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Visão Anual ({currentYear})
                      </h3>
                      <div className="flex-1 w-full min-h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={yearData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <Bar dataKey="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="Despesas" fill="#f43f5e" radius={[3, 3, 0, 0]} maxBarSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="xl:col-span-1 bg-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex flex-col shadow-xl">
                      <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-400" />
                        Maiores Gastos
                    </h3>
                    {pieChartData.length > 0 ? (
                      <div className="flex-1 w-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f1115', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff' }} formatter={(val: number) => formatCurrency(val)} />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: 'white' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-white/40">
                        <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm">Nenhum gasto registrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ) : (
                <div className="space-y-4">
                  {/* Receitas - Inline strip */}
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> Receitas
                      </span>
                      {editingIncome ? (
                        <button onClick={saveIncome} className="flex items-center gap-1 text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                          <Check className="w-3 h-3" /> Salvar
                        </button>
                      ) : (
                        <button onClick={() => setEditingIncome(true)} className="flex items-center gap-1 text-white/30 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-2.5 flex flex-wrap gap-2">
                      {[
                        { label: "Pagamento", field: "pagamento", color: "emerald" },
                        { label: "Adiantamento", field: "vale", color: "indigo" },
                        { label: "Férias", field: "ferias", color: "emerald" },
                        ...(currentMonthIndex === 10 || currentMonthIndex === 11 ? [{ label: "13º Salário", field: "decimoTerceiro", color: "emerald" }] : []),
                      ].map((inputMap) => (
                        <div key={inputMap.field} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${editingIncome ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-black/20'}`}>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${inputMap.color === 'indigo' ? 'text-indigo-400' : 'text-emerald-400'}`}>{inputMap.label}</span>
                          <span className="text-white/20">R$</span>
                          <input
                            type="number"
                            className="bg-transparent text-xs text-white font-mono font-bold outline-none w-20 placeholder-white/10"
                            value={income[inputMap.field as keyof typeof income] || ''}
                            onChange={(e) => updateIncomeLocal(inputMap.field, Number(e.target.value))}
                            readOnly={!editingIncome}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            placeholder="0"
                          />
                          {!editingIncome && <Lock className="w-2.5 h-2.5 text-white/15" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3 Colunas: Pagamento | Adiantamento | Cartões */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Contas Pagamento */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-emerald-500/5">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" /> Pagamento
                        </span>
                        <button onClick={() => addItem('expense_pagamento')} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-white/5 flex-1">
                        {items.filter(i => i.type === 'expense_pagamento').map(item => {
                          const isEdit = editingItems[item.id];
                          return (
                            <div key={item.id} className={`flex flex-col transition-all group ${isEdit ? 'bg-emerald-500/5' : 'hover:bg-white/3'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-indigo-500' : ''}`}>
                                {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                  <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                    <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                      {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                    </span>
                                    <span className="text-white/40 italic">Dividido com {s.target_email}</span>
                                    <span className="text-white/40">Minha parte: <span className="text-emerald-400">{formatCurrency(item.pagamento - s.share_value)}</span></span>
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                placeholder="Descrição"
                              />
                                  <span className="text-white/30 text-[10px]">R$</span>
                                  <input
                                type="number"
                                value={item.pagamento || ''}
                                onChange={(e) => updateItemLocal(item.id, 'pagamento', e.target.value)}
                                readOnly={!isEdit}
                                className="w-16 bg-transparent text-xs font-mono text-emerald-400 text-right outline-none"
                                placeholder="0"
                              />
                                  <div className="flex gap-1 items-center bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/5 shadow-xl shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 hover:text-white'}`} title="Recorrente">
                                      <Repeat className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => { setShareModal({ item }); setShareValue(String((item.pagamento||0) / 2)); }} className="p-1 text-white/20 hover:text-indigo-400 rounded transition-all" title="Compartilhar">
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                        <Check className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-1 text-white/20 hover:text-white rounded transition-all">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 rounded transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                          );
                        })}
                        {items.filter(i => i.type === 'expense_pagamento').length === 0 && (
                          <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhuma conta</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(items.filter(i => i.type === 'expense_pagamento').reduce((a, c) => a + (Number(c.pagamento)||0), 0))}</span>
                      </div>
                    </div>

                    {/* Contas Adiantamento */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
                        <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                          <TrendingDown className="w-3.5 h-3.5" /> Adiantamento
                        </span>
                        <button onClick={() => addItem('expense_vale')} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-white/5 flex-1">
                        {items.filter(i => i.type === 'expense_vale').map(item => {
                          const isEdit = editingItems[item.id];
                          return (
                            <div key={item.id} className={`flex flex-col transition-all group ${isEdit ? 'bg-indigo-500/5' : 'hover:bg-white/3'} ${sentShares.some(s => s.source_item_id === item.id) ? 'border-l-2 border-indigo-500' : ''}`}>
                                {sentShares.filter(s => s.source_item_id === item.id).map(s => (
                                  <div key={s.id} className="flex items-center gap-2 px-3 pt-1.5 text-[9px] opacity-70">
                                    <span className={`px-1 rounded-sm font-bold border ${s.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : s.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                      {s.status === 'pending' ? 'AGUARDANDO' : s.status === 'accepted' ? 'ACEITO' : 'RECUSADO'}
                                    </span>
                                    <span className="text-white/40 italic">Dividido com {s.target_email}</span>
                                    <span className="text-white/40">Minha parte: <span className="text-indigo-400">{formatCurrency(item.vale - s.share_value)}</span></span>
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                readOnly={!isEdit}
                                className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                placeholder="Descrição"
                              />
                                  <span className="text-white/30 text-[10px]">R$</span>
                                  <input
                                type="number"
                                value={item.vale || ''}
                                onChange={(e) => updateItemLocal(item.id, 'vale', e.target.value)}
                                readOnly={!isEdit}
                                className="w-16 bg-transparent text-xs font-mono text-indigo-400 text-right outline-none"
                                placeholder="0"
                              />
                                  <div className="flex gap-1 items-center bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/5 shadow-xl shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/20 hover:text-white'}`} title="Recorrente">
                                      <Repeat className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => { setShareModal({ item }); setShareValue(String((item.vale||0) / 2)); }} className="p-1 text-white/20 hover:text-indigo-400 rounded transition-all" title="Compartilhar">
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                        <Check className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-1 text-white/20 hover:text-white rounded transition-all">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 rounded transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                          );
                        })}
                        {items.filter(i => i.type === 'expense_vale').length === 0 && (
                          <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhuma conta</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-mono font-bold text-indigo-400">{formatCurrency(items.filter(i => i.type === 'expense_vale').reduce((a, c) => a + (Number(c.vale)||0), 0))}</span>
                      </div>
                    </div>

                    {/* Cartões */}
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/3">
                        <span className="text-xs font-bold text-white/60 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" /> Cartões
                        </span>
                        <button onClick={() => addItem('card_pagamento')} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1">
                        {items.filter(i => i.type.startsWith('card_')).map(item => {
                          const isEdit = editingItems[item.id];
                          const isPagamento = item.type === 'card_pagamento';
                          const amountField = isPagamento ? 'pagamento' : 'vale';
                          const isExpanded = expandedCards[item.id];
                          const expenses = cardExpenses[item.id] || [];
                          const hasExpenses = expenses.length > 0;
                          const baseVal = Number(item[amountField] || 0);
                          const expsSum = expenses.reduce((s, e) => s + Number(e.value || 0), 0);
                          const displayTotal = baseVal + expsSum;
                          return (
                            <div key={item.id} className="border-b border-white/5 last:border-0">
                              {/* Cartão header row */}
                              <div className={`flex items-center gap-2 px-3 py-2.5 transition-all group ${isEdit ? 'bg-white/5' : 'hover:bg-white/3'}`}>
                                {/* Expand button */}
                                <button
                                  onClick={() => toggleExpandCard(item.id)}
                                  className={`p-0.5 rounded transition-all shrink-0 ${isExpanded ? 'text-white/60' : 'text-white/20 hover:text-white/60'}`}
                                  title="Ver despesas do cartão"
                                >
                                  <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => updateItemLocal(item.id, 'name', e.target.value)}
                                  readOnly={!isEdit}
                                  className="flex-1 bg-transparent text-xs font-medium text-white/80 outline-none min-w-0"
                                  placeholder="Nome do cartão"
                                />
                                <select
                                  value={isPagamento ? 'pagamento' : 'vale'}
                                  onChange={(e) => updateCardSource(item, e.target.value as 'pagamento' | 'vale')}
                                  disabled={!isEdit}
                                  className={`text-[10px] font-bold outline-none appearance-none cursor-pointer rounded px-1.5 py-0.5 border transition-all ${
                                    isPagamento
                                      ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
                                      : 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400'
                                  } ${!isEdit ? 'pointer-events-none' : ''}`}
                                >
                                  <option value="pagamento" className="bg-[#0f1115] text-emerald-400">Pgto</option>
                                  <option value="vale" className="bg-[#0f1115] text-indigo-400">Adto</option>
                                </select>
                                <span className="text-white/30 text-[10px]">R$</span>
                                {/* Total = base + despesas individuais */}
                                {hasExpenses ? (
                                  <span className={`w-20 text-xs font-mono font-bold text-right ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                    {formatCurrency(displayTotal).replace('R$\u00a0', '')}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    value={item[amountField] || ''}
                                    onChange={(e) => updateItemLocal(item.id, amountField, e.target.value)}
                                    readOnly={!isEdit}
                                    className={`w-16 bg-transparent text-xs font-mono text-right outline-none ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}
                                    placeholder="0"
                                  />
                                )}
                                  <div className="flex gap-0.5 shrink-0">
                                    <button onClick={() => toggleRecurring(item)} className={`p-1 rounded transition-all ${item.is_recurring ? (isPagamento ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 bg-indigo-500/10') : 'text-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`} title="Recorrente">
                                      <Repeat className="w-3 h-3" />
                                      </button>
                                <button onClick={() => { setShareModal({ item }); setShareValue(String(((Number(item.pagamento)||0) + (Number(item.vale)||0)) / 2)); }} className="p-1 text-white/20 hover:text-indigo-400 opacity-0 group-hover:opacity-100 rounded transition-all" title="Compartilhar">
                                      <Share2 className="w-3 h-3" />
                                    </button>
                                    {isEdit ? (
                                      <button onClick={() => saveItem(item)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                        <Check className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingItems(p => ({...p, [item.id]: true}))} className="p-1 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 rounded transition-all">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 rounded transition-all">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                   </div>
                              </div>

                              {/* Expandido: lista de despesas individuais */}
                              {isExpanded && (
                                <div className="bg-black/30 border-t border-white/5">
                                  <div className="divide-y divide-white/5">
                                    {expenses.map(exp => {
                                      const isExpEdit = editingCardExpenses[exp.id];
                                      return (
                                        <div key={exp.id} className={`flex items-center gap-2 pl-8 pr-3 py-2 group transition-all ${isExpEdit ? 'bg-white/5' : 'hover:bg-white/3'}`}>
                                          <span className="text-white/15 text-[10px] shrink-0">└</span>
                                          <input
                                            type="text"
                                            value={exp.name}
                                            onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'name', e.target.value)}
                                            readOnly={!isExpEdit}
                                            className="flex-1 bg-transparent text-[11px] text-white/70 outline-none min-w-0"
                                            placeholder="Descrição da compra"
                                          />
                                          <span className="text-white/20 text-[10px]">R$</span>
                                          <input
                                            type="number"
                                            value={exp.value || ''}
                                            onChange={(e) => updateCardExpenseLocal(item.id, exp.id, 'value', e.target.value)}
                                            readOnly={!isExpEdit}
                                            className={`w-16 bg-transparent text-[11px] font-mono text-right outline-none ${isPagamento ? 'text-emerald-300' : 'text-indigo-300'}`}
                                            placeholder="0"
                                          />
                                          <div className="flex gap-0.5 shrink-0">
                                            <button onClick={() => toggleRecurringCardExpense(item.id, exp)} className={`p-1 rounded transition-all ${exp.is_recurring ? (isPagamento ? 'text-emerald-400 bg-emerald-500/10' : 'text-indigo-400 bg-indigo-500/10') : 'text-white/20 hover:text-white opacity-0 group-hover:opacity-100'}`} title="Recorrente">
                                              <Repeat className="w-2.5 h-2.5" />
                                            </button>
                                            {isExpEdit ? (
                                              <button onClick={() => saveCardExpense(item, exp)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded">
                                                <Check className="w-2.5 h-2.5" />
                                              </button>
                                            ) : (
                                              <button onClick={() => setEditingCardExpenses(p => ({...p, [exp.id]: true}))} className="p-1 text-white/20 hover:text-white opacity-0 group-hover:opacity-100 rounded transition-all">
                                                <Edit2 className="w-2.5 h-2.5" />
                                              </button>
                                            )}
                                            <button onClick={() => removeCardExpense(item, exp.id)} className="p-1 text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 rounded transition-all">
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Linha de adicionar despesa + total */}
                                  <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
                                    <button
                                      onClick={() => addCardExpense(item)}
                                      className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
                                    >
                                      <Plus className="w-3 h-3" /> Adicionar compra
                                    </button>
                                    {hasExpenses && (
                                      <span className={`text-xs font-mono font-bold ${isPagamento ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                        = {formatCurrency(expsSum)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {items.filter(i => i.type.startsWith('card_')).length === 0 && (
                          <div className="px-3 py-4 text-center text-white/20 text-xs">Nenhum cartão</div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Total</span>
                        <span className="text-sm font-mono font-bold text-white/70">{formatCurrency(items.filter(i => i.type.startsWith('card_')).reduce((a, c) => a + (Number(c.pagamento)||0) + (Number(c.vale)||0), 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>

        {/* ======= VIEW: SETTINGS (admin) ======= */}
        {activeView === 'settings' && userProfile?.role === 'admin' && (
          <div className="flex-1 overflow-y-auto p-3 lg:p-6 pb-20 lg:pb-6 relative z-10 custom-scrollbar">
